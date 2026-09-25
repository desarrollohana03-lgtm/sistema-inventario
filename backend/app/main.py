"""Punto de montaje de la aplicación FastAPI."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.infrastructure.database.init_db import seed_db
from app.infrastructure.database.session import SessionLocal
from app.web.routers import (
    agencias_api,
    categorias_api,
    configuracion_api,
    health,
    pages,
    productos_api,
    reportes_api,
    stats_api,
)


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        seed_db(SessionLocal())
        yield

    application = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

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
                else "no-cache"
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

    return application


app = create_app()