"""Motor de respaldos automáticos de la base de datos.

Dinámico según el entorno activo (config .env + DB_BACKEND resuelto en
session.py):
  - SQLite            -> copia segura con shutil.copy2 del archivo .sqlite3.
  - MySQL (o fallback)-> mysqldump invocado por subprocess con la contraseña
                         vía MYSQL_PWD (nunca en la línea de comandos, que es
                         visible en el listado de procesos) y volcado directo
                         a archivo .sql por streaming (stdout -> disco).
El resultado se comprime siempre a backup_YYYYMMDD_HHMMSS.tar.gz en
backend/backups/ y se aplica retención: cualquier respaldo con mtime
anterior a BACKUP_RETENTION_DAYS (defecto 7) se elimina.
"""

import logging
import os
import shutil
import subprocess
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import get_settings

logger = logging.getLogger("hanastock.backup")

BACKUP_DIR = Path(__file__).resolve().parents[2] / "backups"
ARCHIVE_PREFIX = "backup_"
ARCHIVE_GLOB = f"{ARCHIVE_PREFIX}*.tar.gz"
MYSQLDUMP_TIMEOUT_S = 600


class BackupError(RuntimeError):
    """Error operativo del respaldo (binario ausente, server caído, etc.)."""


def backend_activo() -> str:
    """Backend REAL en uso ("sqlite", "sqlite-fallback" o "mysql").

    session.py ya resolvió el fallback en arranque; se lee en tiempo de
    llamada (el módulo queda cacheado por el import de Python) para reflejar
    el estado actual y poder parchearlo en pruebas sin re-importar la app.
    """
    from app.infrastructure.database import session as db_session

    return db_session.DB_BACKEND


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _ruta_sqlite() -> Path:
    """Path del archivo SQLite desde la URL efectiva del entorno."""
    settings = get_settings()
    url = make_url(settings.preferred_database_url)
    if url.drivername != "sqlite":
        raise BackupError("El backend activo no es SQLite.")
    if not url.database:
        raise BackupError("La URL SQLite de configuración no apunta a un archivo.")
    return Path(url.database)


def _copiar_sqlite(destino_dir: Path, ts: str) -> Path:
    """Copia segura del .sqlite3 a la zona temporal de trabajo."""
    origen = _ruta_sqlite()
    if not origen.exists():
        raise BackupError(f"No existe el archivo de BD SQLite: {origen}")
    copia = destino_dir / f"{origen.stem}_{ts}.sqlite3"
    shutil.copy2(origen, copia)
    return copia


def _volcar_mysql(destino_dir: Path, ts: str) -> Path:
    """mysqldump -> .sql por streaming en el directorio temporal.

    La contraseña viaja en MYSQL_PWD (no visible en /proc/ps) y stdout se
    copia directo a disco con copyfileobj (sin cargar el dump en memoria).
    """
    settings = get_settings()
    dump_bin = shutil.which("mysqldump")
    if not dump_bin:
        raise BackupError(
            "mysqldump no está instalado o no está en el PATH "
            "(en XAMPP: C:\\xampp\\mysql\\bin)."
        )

    salida = destino_dir / f"{settings.DB_NAME}_{ts}.sql"
    cmd = [
        dump_bin,
        f"--host={settings.DB_HOST}",
        f"--port={settings.DB_PORT}",
        f"--user={settings.DB_USER}",
        "--protocol=TCP",
        "--single-transaction",
        "--routines",
        "--triggers",
        "--default-character-set=utf8mb4",
        "--quick",
        settings.DB_NAME,
    ]
    entorno = {**os.environ, "MYSQL_PWD": settings.DB_PASSWORD}

    with salida.open("wb") as fh:
        proc = subprocess.run(
            cmd,
            stdout=fh,
            stderr=subprocess.PIPE,
            env=entorno,
            stdin=subprocess.DEVNULL,
            timeout=MYSQLDUMP_TIMEOUT_S,
        )
    if proc.returncode != 0:
        salida.unlink(missing_ok=True)
        detalle = proc.stderr.decode("utf-8", errors="replace").strip()
        raise BackupError(f"mysqldump falló (rc={proc.returncode}): {detalle}")
    if salida.stat().st_size == 0:
        salida.unlink(missing_ok=True)
        raise BackupError("mysqldump produjo un volcado vacío.")
    return salida


def _comprimir(archivo: Path, ts: str) -> Path:
    """Empaqueta el volcado en BACKUP_DIR/backup_YYYYMMDD_HHMMSS.tar.gz."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    archive_path = BACKUP_DIR / f"{ARCHIVE_PREFIX}{ts}.tar.gz"
    with tarfile.open(archive_path, "w:gz") as tar:
        tar.add(archivo, arcname=archivo.name)
    return archive_path


def aplicar_retencion(dias: int | None = None) -> list[str]:
    """Elimina respaldos con mtime anterior a `dias` (defecto: settings).

    Devuelve los nombres eliminados. Sólo toca archivos que coincidan con
    el patrón backup_*.tar.gz — cualquier otra cosa en la carpeta se respeta.
    """
    if dias is None:
        dias = get_settings().BACKUP_RETENTION_DAYS
    corte = time.time() - dias * 86400
    eliminados: list[str] = []
    if not BACKUP_DIR.exists():
        return eliminados
    for ruta in BACKUP_DIR.glob(ARCHIVE_GLOB):
        try:
            if ruta.stat().st_mtime < corte:
                ruta.unlink()
                eliminados.append(ruta.name)
        except OSError as exc:
            logger.warning("No se pudo eliminar %s: %s", ruta, exc)
    if eliminados:
        logger.info("Retención %sd: %d respaldo(s) viejo(s) eliminado(s).", dias, len(eliminados))
    return eliminados


def listar_respaldos() -> list[dict]:
    """Inventario de respaldos presentes (para el dashboard de administración)."""
    if not BACKUP_DIR.exists():
        return []
    items = []
    for ruta in sorted(BACKUP_DIR.glob(ARCHIVE_GLOB), reverse=True):
        stat = ruta.stat()
        items.append(
            {
                "filename": ruta.name,
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            }
        )
    return items


def run_backup() -> dict:
    """Punto de entrada único: copia/vuelca, comprime y aplica retención.

    Apto para ejecutarse desde un worker de hilo (APScheduler/endpoint):
    no toca el event loop ni abre conexiones ORM (trabajo a nivel archivo).
    """
    ts = _timestamp()
    backend = backend_activo()
    t0 = time.monotonic()

    with tempfile.TemporaryDirectory(prefix="hanabackup_") as tmp:
        tmp_dir = Path(tmp)
        if backend == "mysql":
            origen = _volcar_mysql(tmp_dir, ts)
        else:  # "sqlite" y "sqlite-fallback" comparten ruta de copia
            origen = _copiar_sqlite(tmp_dir, ts)
        archive = _comprimir(origen, ts)

    eliminados = aplicar_retencion()
    info = {
        "filename": archive.name,
        "path": str(archive),
        "size_bytes": archive.stat().st_size,
        "backend": backend,
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
        "retenidos_eliminados": eliminados,
        "duracion_ms": int((time.monotonic() - t0) * 1000),
    }
    logger.info(
        "Respaldo %s creado (%s, %.1f KB, %d ms).",
        info["filename"],
        backend,
        info["size_bytes"] / 1024,
        info["duracion_ms"],
    )
    return info
