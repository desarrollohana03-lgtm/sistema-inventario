"""Páginas HTML (Jinja2 + Tailwind). SRP: solo orquestan y renderizan."""

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse

from app.infrastructure.templates.jinja2 import templates
from app.interfaces.services import CategoriaService as CategoriaServiceContract
from app.interfaces.services import ProductoService as ProductoServiceContract
from app.web.dependencies import get_categoria_service, get_producto_service

router = APIRouter(include_in_schema=False)


@router.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


@router.get("/productos", response_class=HTMLResponse)
def ver_productos(
    request: Request,
    term: str | None = Query(default=None),
    categoria_id: int | None = Query(default=None),
    stock_min: int | None = Query(default=None, ge=0),
    categoria_service: CategoriaServiceContract = Depends(get_categoria_service),
    producto_service: ProductoServiceContract = Depends(get_producto_service),
):
    return templates.TemplateResponse(
        request=request,
        name="pages/productos.html",
        context={
            "titulo": "Productos",
            "productos": producto_service.list_productos(
                term=term, categoria_id=categoria_id, stock_min=stock_min
            ),
            "categorias": categoria_service.list_categorias(),
            "filtros": {
                "term": term or "",
                "categoria_id": categoria_id,
                "stock_min": stock_min,
            },
        },
    )