"""Páginas HTML (Jinja2 + Tailwind). SRP: solo orquestan y renderizan."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse

from app.core.config import get_settings
from app.domain.entities.agencia import Agencia
from app.infrastructure.templates.jinja2 import templates
from app.interfaces.services import AgenciaService as AgenciaServiceContract
from app.interfaces.services import CategoriaService as CategoriaServiceContract
from app.interfaces.services import ProductoService as ProductoServiceContract
from app.web.dependencies import (
    get_agencia_service,
    get_categoria_service,
    get_producto_service,
)

router = APIRouter(include_in_schema=False)

_PASOS_EJE = (1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000)


def _escala_eje(max_unidades: int) -> int:
    """Máximo del eje Y con 4 tramos legibles que nunca queda por debajo del dato."""
    if max_unidades <= 0:
        return 4
    for paso in _PASOS_EJE:
        if paso * 4 >= max_unidades:
            return paso * 4
    return ((max_unidades + 3) // 4) * 4


def _distribucion_contexto(items: list[tuple[str, int]]) -> dict:
    max_unidades = max((unidades for _, unidades in items), default=0)
    eje_max = _escala_eje(max_unidades)
    return {
        "distribucion": [
            {
                "nombre": nombre,
                "unidades": unidades,
                "pct": round(unidades / eje_max * 100),
            }
            for nombre, unidades in items
        ],
        "distribucion_ticks": [round(eje_max * (1 - indice / 4)) for indice in range(5)],
    }


def _agencias_contexto(agencias: list[Agencia]) -> dict:
    ahora = datetime.now()
    filas = []
    for agencia in agencias:
        sync = agencia.ultima_sincronizacion
        filas.append(
            {
                "codigo": agencia.codigo,
                "nombre": agencia.nombre,
                "region": agencia.region,
                "host": agencia.host,
                "puerto": agencia.puerto,
                "direccion": f"{agencia.host}:{agencia.puerto}",
                "plataforma": agencia.plataforma,
                "latencia_ms": agencia.latencia_ms,
                "activa": agencia.activa,
                "age_min": max(0, int((ahora - sync).total_seconds() // 60))
                if sync
                else None,
                "sync": sync.strftime("%H:%M") if sync else "--:--",
            }
        )
    return {
        "agencias": filas,
        "agencias_total": len(filas),
        "agencias_activas": sum(1 for fila in filas if fila["activa"]),
    }


@router.get("/", response_class=HTMLResponse)
def index(
    request: Request,
    producto_service: ProductoServiceContract = Depends(get_producto_service),
    agencia_service: AgenciaServiceContract = Depends(get_agencia_service),
):
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "total_stock": producto_service.sumar_stock(),
            "unidades_bajo_minimo": producto_service.sumar_deficit_stock(
                settings.STOCK_MINIMO
            ),
            "stock_minimo": settings.STOCK_MINIMO,
            **_distribucion_contexto(producto_service.stock_por_categoria()),
            **_agencias_contexto(agencia_service.list_agencias()),
        },
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