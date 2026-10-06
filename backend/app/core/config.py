"""Configuración central de la aplicación (DIP de configuración).

Todas las credenciales y parámetros de BD provienen del entorno (.env),
nunca del código fuente. pydantic-settings hace el casting nativo:
DB_PORT -> int, USE_SQLITE_FALLBACK/DEBUG/DB_ECHO -> bool (acepta
true/false, 1/0, yes/no, on/off), VALOR_INVENTARIO_BASE_USD -> float.
"""

import logging
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("hanastock.config")

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", PROJECT_ROOT / "backend" / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "HanaFlow — Sistema de Inventario"
    DEBUG: bool = True
    DB_ECHO: bool = False

    # ===== Base de datos: 100% desde el entorno, sin credenciales en el código =====
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "sistema_inventario"
    USE_SQLITE_FALLBACK: bool = True

    # Override manual opcional: si se define, anula las variables DB_* anteriores.
    DATABASE_URL: str | None = None

    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Clave Fernet para cifrar secretos en reposo (contraseña MySQL, token WA).
    # Si no se define, se auto-genera y guarda en backend/.hana_secret.key.
    SECRET_KEY: str | None = None

    # ===== Respaldos automáticos =====
    # Token de servicio para /api/admin/backups/* (cabecera X-Admin-Token).
    # Vacío = API deshabilitada (fail-closed). Programar sigue activo:
    # el fallo de config se registra al intentar el respaldo.
    ADMIN_BACKUP_TOKEN: str = ""
    BACKUP_RETENTION_DAYS: int = 7
    BACKUP_HOUR: int = 2          # hora local del cron diario (0-23)
    BACKUP_MINUTE: int = 0

    # Umbral de stock mínimo por producto para alertas del panel.
    STOCK_MINIMO: int = 10

    # Valoración de APERTURA del trimestre (base para la variación % del
    # inventario). Ajustarla al cierre valorado del trimestre anterior.
    # Si es 0, el panel muestra la variación como 0.0%.
    VALOR_INVENTARIO_BASE_USD: float = 14400.0

    FRONTEND_DIR: Path = PROJECT_ROOT / "frontend"

    @property
    def templates_dir(self) -> Path:
        return self.FRONTEND_DIR / "templates"

    @property
    def static_dir(self) -> Path:
        return self.FRONTEND_DIR / "static"

    @property
    def sqlite_url(self) -> str:
        """Ruta del SQLite local de desarrollo/respaldo."""
        return f"sqlite:///{(PROJECT_ROOT / 'backend' / 'inventario.sqlite3').as_posix()}"

    @property
    def mysql_url(self) -> str:
        """String MySQL construido desde variables tipadas.

        quote_plus protege caracteres especiales de la contraseña
        (@, :, /, %) que romperían el parseo de la URL.
        """
        password = quote_plus(self.DB_PASSWORD) if self.DB_PASSWORD else ""
        return (
            f"mysql+pymysql://{self.DB_USER}:{password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    @property
    def preferred_database_url(self) -> str:
        """URL efectiva según la estrategia del entorno.

        DATABASE_URL explícita > SQLite directo (flag) > MySQL desde piezas.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.USE_SQLITE_FALLBACK:
            return self.sqlite_url
        return self.mysql_url

    @property
    def redacted_url(self) -> str:
        """URL sin contraseña para logs/mensajes de error."""
        if self.DATABASE_URL:
            scheme, _, rest = self.DATABASE_URL.partition("://")
            creds, sep, tail = rest.partition("@")
            if sep:
                user, _, _pwd = creds.partition(":")
                return f"{scheme}://{user}:***@{tail}"
            return self.DATABASE_URL
        if self.USE_SQLITE_FALLBACK:
            return self.sqlite_url
        return (
            f"mysql+pymysql://{self.DB_USER}:***"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    logger.info(
        "Configuración de BD cargada desde entorno: %s (fallback SQLite: %s)",
        settings.redacted_url,
        settings.USE_SQLITE_FALLBACK,
    )
    return settings
