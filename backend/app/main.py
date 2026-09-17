"""Punto de montaje de la aplicación FastAPI."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.infrastructure.database.init_db import seed_db
from app.infrastructure.database.session import SessionLocal
from app.web.routers import categorias_api, health, pages, productos_api


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

    application.include_router(health.router)
    application.include_router(pages.router)
    application.include_router(categorias_api.router)
    application.include_router(productos_api.router)

    return application


app = create_app()