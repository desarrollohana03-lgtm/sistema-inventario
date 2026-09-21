"""API JSON de Estadísticas y KPIs en tiempo real."""

from fastapi import APIRouter, Depends

from app.application.schemas.stats import CategoriaDistribucion, StatsOut
from app.core.config import get_settings
from app.interfaces.services import AgenciaService as AgenciaServiceContract
from app.interfaces.services import ProductoService as ProductoServiceContract
from app.web.dependencies import get_agencia_service, get_producto_service

router = APIRouter(prefix="/api/stats", tags=["stats"])

_PASOS_EJE = (1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000)


def _escala_eje(max_unidades: int) -> int:
    if max_unidades <= 0:
        return 4
    for paso in _PASOS_EJE:
        if paso * 4 >= max_unidades:
            return paso * 4
    return ((max_unidades + 3) // 4) * 4


@router.get("", response_model=StatsOut)
def obtener_estadisticas(
    producto_service: ProductoServiceContract = Depends(get_producto_service),
    agencia_service: AgenciaServiceContract = Depends(get_agencia_service),
):
    settings = get_settings()
    stock_items = producto_service.stock_por_categoria()
    max_unidades = max((unidades for _, unidades in stock_items), default=0)
    eje_max = _escala_eje(max_unidades)

    distribucion = [
        CategoriaDistribucion(
            nombre=nombre,
            unidades=unidades,
            pct=round(unidades / eje_max * 100) if eje_max > 0 else 0,
        )
        for nombre, unidades in stock_items
    ]

    distribucion_ticks = [
        round(eje_max * (1 - indice / 4)) for indice in range(5)
    ]

    total_stock = producto_service.sumar_stock()
    deficit = producto_service.sumar_deficit_stock(settings.STOCK_MINIMO)
    total_prods = producto_service.contar_productos()
    agencias = agencia_service.list_agencias()
    agencias_activas = sum(1 for a in agencias if a.activa)

    return StatsOut(
        total_stock=total_stock,
        unidades_bajo_minimo=deficit,
        stock_minimo=settings.STOCK_MINIMO,
        total_productos=total_prods,
        agencias_activas=agencias_activas,
        agencias_total=len(agencias),
        distribucion=distribucion,
        distribucion_ticks=distribucion_ticks,
    )
