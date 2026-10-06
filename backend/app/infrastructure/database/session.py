"""Motor, sesión y dependencia de BD (DIP: la sesión se inyecta vía Depends).

Estrategia de conexión (todo desde el entorno, sin credenciales en código):
  1. USE_SQLITE_FALLBACK=true  -> SQLite local directo (modo desarrollo).
  2. USE_SQLITE_FALLBACK=false -> exige MySQL; si la conexión falla con
     OperationalError (p. ej. XAMPP apagado), se captura, se registra un
     WARNING y se degrada automáticamente a SQLite.
  3. DATABASE_URL explícita en .env anula lo anterior.
"""

import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger("hanastock.db")

settings = get_settings()


def _make_engine(url: str) -> Engine:
    """Crea el Engine con opciones adecuadas a cada dialecto."""
    kwargs: dict = {
        "echo": settings.DB_ECHO,
        "future": True,
        "pool_pre_ping": True,
    }
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        # MySQL cierra conexiones ociosas (wait_timeout); reciclarlas evita
        # "MySQL server has gone away" en procesos largos.
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10
        kwargs["pool_recycle"] = 3600
    return create_engine(url, **kwargs)


def _build_engine() -> tuple[Engine, str]:
    """Resuelve el motor definitivo con fallback operativo a SQLite."""
    url = settings.preferred_database_url

    # Caso 1: el entorno pide SQLite sin intentar MySQL.
    if (
        not settings.DATABASE_URL
        and settings.USE_SQLITE_FALLBACK
        and url == settings.sqlite_url
    ):
        logger.info(
            "USE_SQLITE_FALLBACK=true -> SQLite local (%s) sin intentar MySQL.",
            settings.sqlite_url,
        )
        return _make_engine(url), "sqlite"

    engine = _make_engine(url)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        backend = "sqlite" if url.startswith("sqlite") else "mysql"
        logger.info("Conexión %s verificada: %s", backend, settings.redacted_url)
        return engine, backend
    except OperationalError as exc:
        engine.dispose()
        # Un SQLite declarado explícitamente y roto no tiene de dónde caer:
        # fallar ruidoso es mejor que silenciar corrupción de entorno.
        if url.startswith("sqlite"):
            logger.error("No se pudo abrir el SQLite configurado: %s", exc)
            raise
        logger.warning(
            "MySQL inaccesible en %s (OperationalError: %s). "
            "Degrado automático a SQLite local: %s",
            settings.redacted_url,
            exc.orig.__class__.__name__ if exc.orig else str(exc),
            settings.sqlite_url,
        )
        return _make_engine(settings.sqlite_url), "sqlite-fallback"
    except Exception:
        engine.dispose()
        raise


engine, DB_BACKEND = _build_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
