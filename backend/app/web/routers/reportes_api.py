"""API de reportes descargables (CSV, XLSX y PDF)."""

import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.config import get_settings
from app.application.schemas.stats import StatsPdfIn
from app.infrastructure.reports import pdf_builder, xlsx_builder
from app.interfaces.services import (
    DespachoService as DespachoServiceContract,
)
from app.interfaces.services import (
    IngresoService as IngresoServiceContract,
)
from app.interfaces.services import (
    ProductoService as ProductoServiceContract,
)
from app.web.dependencies import (
    get_despacho_service,
    get_ingreso_service,
    get_producto_service,
)

router = APIRouter(prefix="/api/reportes", tags=["reportes"])

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _csv_response(filename: str, writer_rows: list[list]) -> Response:
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_ALL)
    for row in writer_rows:
        writer.writerow(row)
    return Response(
        content="\ufeff" + buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _file_response(filename: str, content: bytes, media_type: str) -> Response:
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _datos_inventario(
    service: ProductoServiceContract,
) -> tuple[list[dict], dict]:
    minimo = get_settings().STOCK_MINIMO
    productos = sorted(service.list_productos(), key=lambda x: x.codigo)

    datos: list[dict] = []
    for p in productos:
        valor = p.stock * float(p.precio)
        faltante = max(0, minimo - p.stock)
        datos.append(
            {
                "codigo": p.codigo,
                "nombre": p.nombre,
                "marca": p.marca or "",
                "categoria": p.categoria.nombre if p.categoria else "Sin categoría",
                "pasillo": p.pasillo or "",
                "stock": p.stock,
                "precio": float(p.precio),
                "moneda": p.moneda.value,
                "valor": valor,
                "estado": "BAJO" if p.stock < minimo else "OK",
                "faltante": faltante,
            }
        )

    resumen = {
        "skus": len(datos),
        "unidades": sum(d["stock"] for d in datos),
        "valor": sum(d["valor"] for d in datos),
        "alertas": sum(1 for d in datos if d["estado"] == "BAJO"),
        "faltante": sum(d["faltante"] for d in datos),
        "costo_reposicion": sum(d["faltante"] * d["precio"] for d in datos),
        "minimo": minimo,
    }
    return datos, resumen


def _datos_movimientos(
    dias: int,
    producto_service: ProductoServiceContract,
    despacho_service: DespachoServiceContract,
    ingreso_service: IngresoServiceContract,
) -> tuple[list[dict], dict, str]:
    desde = datetime.now() - timedelta(days=dias)
    productos = {p.id: p for p in producto_service.list_productos()}

    datos: list[dict] = []
    for i in ingreso_service.listar_desde(desde):
        prod = productos.get(i.producto_id)
        datos.append(
            {
                "fecha_dt": i.fecha,
                "tipo": "ENTRADA",
                "codigo": i.codigo,
                "contraparte": i.proveedor,
                "producto": f"{prod.codigo} — {prod.nombre}" if prod else "(producto eliminado)",
                "articulos": i.articulos,
                "total": float(i.total),
                "estado": "",
            }
        )
    for d in despacho_service.listar_desde(desde):
        prod = productos.get(d.producto_id)
        datos.append(
            {
                "fecha_dt": d.fecha,
                "tipo": "SALIDA",
                "codigo": d.codigo,
                "contraparte": d.destino,
                "producto": f"{prod.codigo} — {prod.nombre}" if prod else "(producto eliminado)",
                "articulos": d.articulos,
                "total": float(d.total),
                "estado": d.estado.value,
            }
        )
    datos.sort(key=lambda m: m["fecha_dt"], reverse=True)
    for d in datos:
        d["fecha"] = d["fecha_dt"].strftime("%d/%m/%Y %H:%M")

    resumen = {
        "entradas": sum(1 for d in datos if d["tipo"] == "ENTRADA"),
        "salidas": sum(1 for d in datos if d["tipo"] == "SALIDA"),
        "unidades_in": sum(d["articulos"] for d in datos if d["tipo"] == "ENTRADA"),
        "unidades_out": sum(d["articulos"] for d in datos if d["tipo"] == "SALIDA"),
        "total_in": sum(d["total"] for d in datos if d["tipo"] == "ENTRADA"),
        "total_out": sum(d["total"] for d in datos if d["tipo"] == "SALIDA"),
    }
    periodo = f"Periodo: últimos {dias} días (desde {desde:%d/%m/%Y %H:%M})"
    return datos, resumen, periodo


def _datos_valoracion(service: ProductoServiceContract) -> tuple[list[dict], float]:
    crudos = service.valoracion_por_categoria()
    total_valor = sum(valor for _, _, _, valor in crudos)
    datos = [
        {
            "categoria": nombre,
            "skus": skus,
            "unidades": unidades,
            "valor": valor,
            "pct": round(valor / total_valor * 100, 1) if total_valor > 0 else 0.0,
        }
        for nombre, skus, unidades, valor in crudos
    ]
    return datos, total_valor


# ---------------------------------------------------------------- CSV


@router.get("/inventario.csv")
def reporte_inventario_csv(
    service: ProductoServiceContract = Depends(get_producto_service),
):
    """CSV detallado de todo el inventario + alertas de stock bajo."""
    settings = get_settings()
    datos, resumen = _datos_inventario(service)

    rows: list[list] = [
        ["Mundo Hana — Reporte de Inventario Detallado"],
        ["Generado", datetime.now().strftime("%d/%m/%Y %H:%M")],
        ["Umbral stock mínimo", settings.STOCK_MINIMO],
        [],
        ["Código", "Nombre", "Marca", "Categoría", "Pasillo", "Stock",
         "Precio", "Moneda", "Valor (stock × precio)", "Estado"],
    ]
    for d in datos:
        rows.append([
            d["codigo"], d["nombre"], d["marca"], d["categoria"], d["pasillo"],
            d["stock"], f"{d['precio']:.2f}", d["moneda"], f"{d['valor']:.2f}", d["estado"],
        ])
    rows.append([])
    rows.append(["TOTALES", f"{resumen['skus']} SKUs", "", "", "", resumen["unidades"],
                 "", "", f"{resumen['valor']:.2f}", ""])
    rows.append([])
    rows.append([f"ALERTAS DE STOCK BAJO (umbral: {settings.STOCK_MINIMO})"])
    rows.append(["Código", "Nombre", "Stock actual", "Mínimo", "Unidades faltantes"])
    alertas = [d for d in datos if d["estado"] == "BAJO"]
    for d in sorted(alertas, key=lambda x: x["stock"]):
        rows.append([d["codigo"], d["nombre"], d["stock"], settings.STOCK_MINIMO, d["faltante"]])
    if not alertas:
        rows.append(["—", "Sin alertas", "", "", 0])
    else:
        rows.append(["TOTAL FALTANTE", "", "", "", resumen["faltante"]])

    return _csv_response(f"inventario-{datetime.now():%Y-%m-%d}.csv", rows)


@router.get("/movimientos.csv")
def reporte_movimientos_csv(
    dias: int = Query(default=30, ge=1, le=365),
    producto_service: ProductoServiceContract = Depends(get_producto_service),
    despacho_service: DespachoServiceContract = Depends(get_despacho_service),
    ingreso_service: IngresoServiceContract = Depends(get_ingreso_service),
):
    """CSV de entradas (ingresos) y salidas (despachos) de los últimos `dias` días."""
    datos, resumen, periodo = _datos_movimientos(dias, producto_service, despacho_service, ingreso_service)

    rows: list[list] = [
        ["Mundo Hana — Reporte de Movimientos"],
        ["Periodo", periodo.replace("Periodo: ", "")],
        ["Generado", datetime.now().strftime("%d/%m/%Y %H:%M")],
        [],
        ["Fecha", "Tipo", "Código", "Contraparte", "Producto", "Artículos", "Total", "Estado"],
    ]
    for d in datos:
        rows.append([d["fecha"], d["tipo"], d["codigo"], d["contraparte"],
                     d["producto"], d["articulos"], f"{d['total']:.2f}", d["estado"]])
    if not datos:
        rows.append(["—", "Sin movimientos en el periodo"])
    rows.append([])
    rows.append(["RESUMEN"])
    rows.append(["Entradas", resumen["entradas"], "unidades:", resumen["unidades_in"], "total:", f"{resumen['total_in']:.2f}"])
    rows.append(["Salidas", resumen["salidas"], "unidades:", resumen["unidades_out"], "total:", f"{resumen['total_out']:.2f}"])

    return _csv_response(f"movimientos-{datetime.now():%Y-%m-%d}.csv", rows)


@router.get("/valoracion-categorias.csv")
def reporte_valoracion_csv(
    service: ProductoServiceContract = Depends(get_producto_service),
):
    """CSV de unidades y valor del inventario agrupados por categoría."""
    datos, total_valor = _datos_valoracion(service)

    rows: list[list] = [
        ["Mundo Hana — Valoración del Inventario por Categoría"],
        ["Generado", datetime.now().strftime("%d/%m/%Y %H:%M")],
        [],
        ["Categoría", "SKUs", "Unidades", "Valor (stock × precio)", "% del inventario"],
    ]
    for d in datos:
        rows.append([d["categoria"], d["skus"], d["unidades"], f"{d['valor']:.2f}", f"{d['pct']}%"])
    rows.append([])
    rows.append(["TOTALES", sum(d["skus"] for d in datos), sum(d["unidades"] for d in datos),
                 f"{total_valor:.2f}", "100%"])

    return _csv_response(f"valoracion-categorias-{datetime.now():%Y-%m-%d}.csv", rows)


# ---------------------------------------------------------------- XLSX


@router.get("/inventario.xlsx")
def reporte_inventario_xlsx(
    service: ProductoServiceContract = Depends(get_producto_service),
):
    datos, resumen = _datos_inventario(service)
    generado = datetime.now().strftime("%d/%m/%Y %H:%M")
    content = xlsx_builder.inventario_xlsx(datos, resumen, generado)
    return _file_response(
        f"inventario-{datetime.now():%Y-%m-%d}.xlsx", content, XLSX_MIME
    )


@router.get("/movimientos.xlsx")
def reporte_movimientos_xlsx(
    dias: int = Query(default=30, ge=1, le=365),
    producto_service: ProductoServiceContract = Depends(get_producto_service),
    despacho_service: DespachoServiceContract = Depends(get_despacho_service),
    ingreso_service: IngresoServiceContract = Depends(get_ingreso_service),
):
    datos, resumen, periodo = _datos_movimientos(dias, producto_service, despacho_service, ingreso_service)
    generado = datetime.now().strftime("%d/%m/%Y %H:%M")
    content = xlsx_builder.movimientos_xlsx(datos, resumen, generado, periodo)
    return _file_response(
        f"movimientos-{datetime.now():%Y-%m-%d}.xlsx", content, XLSX_MIME
    )


@router.get("/valoracion-categorias.xlsx")
def reporte_valoracion_xlsx(
    service: ProductoServiceContract = Depends(get_producto_service),
):
    datos, total_valor = _datos_valoracion(service)
    generado = datetime.now().strftime("%d/%m/%Y %H:%M")
    content = xlsx_builder.valoracion_xlsx(datos, total_valor, generado)
    return _file_response(
        f"valoracion-categorias-{datetime.now():%Y-%m-%d}.xlsx", content, XLSX_MIME
    )


# ---------------------------------------------------------------- PDF


@router.get("/inventario.pdf")
def reporte_inventario_pdf(
    service: ProductoServiceContract = Depends(get_producto_service),
):
    datos, resumen = _datos_inventario(service)
    generado = datetime.now().strftime("%d/%m/%Y %H:%M")
    content = pdf_builder.inventario_pdf(datos, resumen, generado)
    return _file_response(
        f"inventario-{datetime.now():%Y-%m-%d}.pdf", content, "application/pdf"
    )


@router.get("/movimientos.pdf")
def reporte_movimientos_pdf(
    dias: int = Query(default=30, ge=1, le=365),
    producto_service: ProductoServiceContract = Depends(get_producto_service),
    despacho_service: DespachoServiceContract = Depends(get_despacho_service),
    ingreso_service: IngresoServiceContract = Depends(get_ingreso_service),
):
    datos, resumen, periodo = _datos_movimientos(dias, producto_service, despacho_service, ingreso_service)
    generado = datetime.now().strftime("%d/%m/%Y %H:%M")
    content = pdf_builder.movimientos_pdf(datos, resumen, generado, periodo)
    return _file_response(
        f"movimientos-{datetime.now():%Y-%m-%d}.pdf", content, "application/pdf"
    )


@router.get("/valoracion-categorias.pdf")
def reporte_valoracion_pdf(
    service: ProductoServiceContract = Depends(get_producto_service),
):
    datos, total_valor = _datos_valoracion(service)
    generado = datetime.now().strftime("%d/%m/%Y %H:%M")
    content = pdf_builder.valoracion_pdf(datos, total_valor, generado)
    return _file_response(
        f"valoracion-categorias-{datetime.now():%Y-%m-%d}.pdf", content, "application/pdf"
    )


@router.post("/estadisticas.pdf")
def reporte_estadisticas_pdf(payload: StatsPdfIn):
    datos = [f.model_dump() for f in payload.filas]
    generado = datetime.now().strftime("%d/%m/%Y %H:%M")
    content = pdf_builder.estadisticas_pdf(datos, payload.periodo, payload.intervalo, generado)
    return _file_response(
        f"estadisticas-saldos-{datetime.now():%Y-%m-%d}.pdf", content, "application/pdf"
    )
