"""API de administración de respaldos (protegida con token de servicio).

Autenticación: header `X-Admin-Token` comparado en tiempo constante contra
ADMIN_BACKUP_TOKEN del .env. Fail-closed por diseño:
  - token no configurado -> 503 (endpoint deliberadamente inhabilitado),
  - token ausente/erróneo -> 401.
Los endpoints son `def` (no async): FastAPI los corre en su threadpool y
el trabajo pesado de backup (copia de archivo / subprocess mysqldump)
nunca bloquea el event loop HTTP.
"""

import logging
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.core.backup import BackupError, listar_respaldos, run_backup
from app.core.config import get_settings

logger = logging.getLogger("hanastock.admin_backups")

router = APIRouter(prefix="/api/admin/backups", tags=["admin-backups"])


class BackupOut(BaseModel):
    filename: str
    path: str
    size_bytes: int
    backend: str
    created_at: str
    retenidos_eliminados: list[str]
    duracion_ms: int


class BackupInfo(BaseModel):
    filename: str
    size_bytes: int
    created_at: str


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    esperado = get_settings().ADMIN_BACKUP_TOKEN
    if not esperado:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API de respaldos deshabilitada: defina ADMIN_BACKUP_TOKEN en el .env del backend.",
        )
    if not x_admin_token or not secrets.compare_digest(x_admin_token, esperado):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de administrador inválido o ausente (cabecera X-Admin-Token).",
        )


@router.post("/trigger", response_model=BackupOut, status_code=status.HTTP_201_CREATED)
def forzar_respaldo(_: None = Depends(require_admin)):
    """Snapshot inmediato de la BD activa + retención de 7 días."""
    try:
        return BackupOut(**run_backup())
    except BackupError as exc:
        logger.error("Respaldo manual rechazado: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"El respaldo falló y no se escribió ningún archivo: {exc}",
        )


@router.get("", response_model=list[BackupInfo])
def inventario_respaldos(_: None = Depends(require_admin)):
    """Listado de respaldos disponibles (nombre, tamaño, fecha UTC)."""
    return [BackupInfo(**item) for item in listar_respaldos()]
