"""Punto de montaje de la aplicación FastAPI."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.backup import BackupError, run_backup
from app.core.config import get_settings
from app.infrastructure.database.init_db import seed_db
from app.infrastructure.database.session import SessionLocal
from app.web.routers import (
    admin_backups_api,
    agencias_api,
    categorias_api,
    configuracion_api,
    health,
    pages,
    productos_api,
    reportes_api,
    stats_api,
)

logger = logging.getLogger("hanastock.main")


def _job_respaldo_diario() -> None:
    """Wrapper del cron: un fallo de respaldo NUNCA debe tumbar el scheduler."""
    try:
        info = run_backup()
        logger.info(
            "Respaldo programado OK: %s (%.1f KB, backend %s)",
            info["filename"],
            info["size_bytes"] / 1024,
            info["backend"],
        )
    except BackupError as exc:
        logger.error("Respaldo programado falló: %s", exc)
    except Exception:
        logger.exception("Respaldo programado: error inesperado")


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        seed_db(SessionLocal())

        # Cron diario de respaldos a hora de bajo tráfico (defecto 02:00).
        # AsyncIOScheduler despacha el job sync en su propio ThreadPoolExecutor:
        # ni mysqldump ni la copia de archivo bloquean nunca el event loop HTTP.
        scheduler = AsyncIOScheduler(timezone=None)
        scheduler.add_job(
            _job_respaldo_diario,
            CronTrigger(hour=settings.BACKUP_HOUR, minute=settings.BACKUP_MINUTE),
            id="backup-diario",
            name="Respaldo diario de base de datos",
            coalesce=True,               # si el equipo estuvo apagado, una sola ejecución
            max_instances=1,             # nunca dos respaldos simultáneos
            misfire_grace_time=3600,     # tolerancia de 1 h si el disparo se pierde
        )
        scheduler.start()
        _.state.backup_scheduler = scheduler
        proximo = scheduler.get_job("backup-diario").next_run_time
        logger.info("Cron de respaldos activo: diario a las %02d:%02d (próximo: %s)",
                    settings.BACKUP_HOUR, settings.BACKUP_MINUTE, proximo)

        yield

        scheduler.shutdown(wait=False)

    application = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )
    application.add_middleware(GZipMiddleware, minimum_size=860)

    application.mount(
        "/static",
        StaticFiles(directory=str(settings.static_dir)),
        name="static",
    )

    @application.middleware("http")
    async def revalidate_static(request: Request, call_next):
        """Dev: no se cachea nada (F5 siempre fresco). Prod: revalidación por ETag.

        Cubre también el documento HTML: sin cabeceras, el navegador aplica
        caché heurística y el F5 puede servir una página vieja (con JS y CSS
        desincronizados). El ?v= de los assets además se recalcula por request.
        """
        response = await call_next(request)
        if request.url.path.startswith("/static"):
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
                if settings.DEBUG
                # Prod: los assets llevan ?v=<mtime>, así que se pueden cachar
                # un año sin riesgo de quedar obsoletos (el ?v cambia al build).
                else "public, max-age=31536000, immutable"
            )
        elif "text/html" in response.headers.get("content-type", ""):
            response.headers["Cache-Control"] = (
                "no-store" if settings.DEBUG else "no-cache"
            )
        return response

    application.include_router(health.router)
    application.include_router(pages.router)
    application.include_router(categorias_api.router)
    application.include_router(productos_api.router)
    application.include_router(agencias_api.router)
    application.include_router(stats_api.router)
    application.include_router(reportes_api.router)
    application.include_router(configuracion_api.router)
    application.include_router(admin_backups_api.router)

    return application


app = create_app()