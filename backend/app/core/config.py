"""Configuración central de la aplicación (DIP de configuración)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

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

    # Defecto SQLite para correr sin servidor MySQL (producción: definir .env).
    DATABASE_URL: str = (
        f"sqlite:///{(PROJECT_ROOT / 'backend' / 'inventario.sqlite3').as_posix()}"
    )

    HOST: str = "127.0.0.1"
    PORT: int = 8000

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


@lru_cache
def get_settings() -> Settings:
    return Settings()