"""Proveedor de plantillas Jinja2 (apuntan a frontend/templates)."""

from fastapi.templating import Jinja2Templates

from app.core.config import get_settings

settings = get_settings()

templates = Jinja2Templates(directory=str(settings.templates_dir))

templates.env.globals["APP_NAME"] = settings.APP_NAME


def _format_precio(value) -> str:
    return f"{value:,.2f}"


templates.env.filters["precio"] = _format_precio