"""Páginas HTML (Jinja2 + Tailwind). SRP: solo orquestan y renderizan."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, PlainTextResponse

from app.core.config import get_settings
from app.domain.entities.agencia import Agencia
from app.infrastructure.templates.jinja2 import templates
from app.interfaces.services import AgenciaService as AgenciaServiceContract
from app.interfaces.services import CategoriaService as CategoriaServiceContract
from app.interfaces.services import DespachoService as DespachoServiceContract
from app.interfaces.services import IngresoService as IngresoServiceContract
from app.interfaces.services import ProductoService as ProductoServiceContract
from app.web.dependencies import (
    get_agencia_service,
    get_categoria_service,
    get_despacho_service,
    get_ingreso_service,
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
                "age_sec": int((ahora - sync).total_seconds()) if sync else None,
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
    despacho_service: DespachoServiceContract = Depends(get_despacho_service),
    ingreso_service: IngresoServiceContract = Depends(get_ingreso_service),
):
    settings = get_settings()
    valor_inventario = producto_service.valor_inventario()
    base = settings.VALOR_INVENTARIO_BASE_USD
    valorizacion_pct = (
        round((valor_inventario - base) / base * 100, 1) if base > 0 else 0.0
    )
    total_despachos = despacho_service.total_despachos()
    variacion_semanal_pct = despacho_service.variacion_semanal_pct()
    alertas_stock_bajo = producto_service.alertas_stock_bajo(settings.STOCK_MINIMO)
    pasillos_criticos = producto_service.pasillos_criticos(settings.STOCK_MINIMO)
    entradas_mes = ingreso_service.ingresos_ultimos_dias(30)
    salidas_mes = despacho_service.despachos_ultimos_dias(30)
    movimientos_mes = entradas_mes + salidas_mes
    proporcion_movimientos = (
        round(entradas_mes / salidas_mes, 2) if salidas_mes > 0 else 0.0
    )
    skus_activos = len(
        despacho_service.productos_movilizados_ultimos_dias(30)
        | ingreso_service.productos_movilizados_ultimos_dias(30)
    )
    total_skus = producto_service.contar_productos()
    pct_skus_activos = round(skus_activos / total_skus * 100, 1) if total_skus else 0.0

    ahora = datetime.now()

    def _age_text(sec: int) -> str:
        if sec < 60:
            return f"Hace {sec} seg"
        if sec < 3600:
            return f"Hace {sec // 60} min"
        if sec < 86400:
            return f"Hace {sec // 3600} h"
        return f"Hace {sec // 86400} d"

    agencias = agencia_service.list_agencias()
    nombres_agencia = {a.codigo: a.nombre for a in agencias}
    nombres_producto = {p.id: p.nombre for p in producto_service.list_productos()}

    def _nombre_agencia(codigo: str) -> str:
        if codigo == "Central":
            return "la Central"
        nombre = nombres_agencia.get(codigo)
        return f"{nombre} ({codigo})" if nombre else codigo

    feed: list[dict] = []
    for d in despacho_service.despachos_recientes(12):
        producto = nombres_producto.get(d.producto_id)
        destino = _nombre_agencia(d.destino)
        resto = f"de {producto} → {destino}" if producto else f"despachadas a {destino}"
        feed.append(
            {
                "tipo": "salida",
                "destacado": f"{d.articulos} uds",
                "resto": resto,
                "detalle": f"Traslado Nº {d.codigo}",
                "fecha": d.fecha,
            }
        )
    for i in ingreso_service.ingresos_recientes(12):
        producto = nombres_producto.get(i.producto_id)
        resto = (
            f"de {producto} recibidas de {i.proveedor}"
            if producto
            else f"recibidas de {i.proveedor}"
        )
        feed.append(
            {
                "tipo": "entrada",
                "destacado": f"{i.articulos} uds",
                "resto": resto,
                "detalle": f"Recepción Nº {i.codigo}",
                "fecha": i.fecha,
            }
        )
    for a in agencias:
        if a.ultima_sincronizacion:
            feed.append(
                {
                    "tipo": "sync",
                    "destacado": "Sincronización",
                    "resto": f"con {a.nombre} ({a.codigo})",
                    "detalle": "Conexión con la central activa",
                    "fecha": a.ultima_sincronizacion,
                }
            )
    feed.sort(key=lambda x: x["fecha"], reverse=True)
    actividades = feed[:6]
    for item in actividades:
        item["age_sec"] = max(0, int((ahora - item["fecha"]).total_seconds()))
        item["age_text"] = _age_text(item["age_sec"])

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "total_stock": producto_service.sumar_stock(),
            "unidades_bajo_minimo": producto_service.sumar_deficit_stock(
                settings.STOCK_MINIMO
            ),
            "stock_minimo": settings.STOCK_MINIMO,
            "valor_inventario": valor_inventario,
            "valorizacion_pct": valorizacion_pct,
            "total_despachos": total_despachos,
            "variacion_semanal_pct": variacion_semanal_pct,
            "alertas_stock_bajo": alertas_stock_bajo,
            "pasillos_criticos": pasillos_criticos,
            "entradas_mes": entradas_mes,
            "salidas_mes": salidas_mes,
            "movimientos_mes": movimientos_mes,
            "proporcion_movimientos": proporcion_movimientos,
            "total_skus": total_skus,
            "skus_activos": skus_activos,
            "pct_skus_activos": pct_skus_activos,
            "actividades": actividades,
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


_SW_KILL = """\
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(self.registration.unregister().then(() => self.clients.claim()))
);
"""


@router.get("/sw.js", include_in_schema=False)
def sw_kill():
    """SW no-op que se desregistra solo: mata registros huérfanos del navegador."""
    return PlainTextResponse(
        _SW_KILL,
        media_type="application/javascript",
        headers={"Cache-Control": "no-store"},
    )