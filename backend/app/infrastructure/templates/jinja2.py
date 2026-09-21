"""Proveedor de plantillas Jinja2 (apuntan a frontend/templates)."""

import time

from fastapi.templating import Jinja2Templates

from app.core.config import get_settings

settings = get_settings()

templates = Jinja2Templates(directory=str(settings.templates_dir))

templates.env.globals["APP_NAME"] = settings.APP_NAME


def _asset_version() -> str:
    """Sello de los assets basado en el mtime de CSS/JS: cambia al recompilar.

    Al usarlo como ?v= en los <link>, el navegador no puede reutilizar una
    copia cacheada vieja (corrige el 'F5 muestra CSS viejo, Ctrl+F5 no').
    """
    static = settings.static_dir
    candidatos = [
        static / "css" / "app.css",
        static / "css" / "custom.css",
        static / "js" / "app.js",
    ]
    marcas = []
    for ruta in candidatos:
        try:
            marcas.append(int(ruta.stat().st_mtime))
        except OSError:
            continue
    return str(max(marcas)) if marcas else str(int(time.time()))


templates.env.globals["ASSET_VER"] = _asset_version()


def _format_precio(value) -> str:
    return f"{value:,.2f}"


templates.env.filters["precio"] = _format_precio