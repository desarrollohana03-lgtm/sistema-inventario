"""Builder de libros XLSX ejecutivos (openpyxl): Resumen + detalle formateado."""

from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

HANA_RED = "E11D48"
HANA_DARK = "121214"
HANA_MUTED = "8B8B93"
ROW_ALT = "F7F7F8"
OK_GREEN = "059669"
OK_BG = "ECFDF5"
ALERT_BG = "FEE2E2"
ALERT_RED = "B91C1C"

_thin = Side(style="thin", color="E4E4E7")
BORDER = Border(left=_thin, right=_thin, top=_thin, bottom=_thin)

HEADER_FONT = Font(bold=True, color="FFFFFF", size=10)
HEADER_FILL = PatternFill("solid", fgColor=HANA_DARK)
TITLE_FONT = Font(bold=True, size=18, color=HANA_RED)
SUBTITLE_FONT = Font(bold=True, size=12, color=HANA_DARK)
META_FONT = Font(size=9, color=HANA_MUTED)
KPI_VALUE_FONT = Font(bold=True, size=16, color=HANA_DARK)
KPI_LABEL_FONT = Font(size=9, color=HANA_MUTED)
TOTAL_FONT = Font(bold=True, size=10, color=HANA_DARK)
TOTAL_FILL = PatternFill("solid", fgColor="F4F4F5")

MONEY_FMT = "#,##0.00"
INT_FMT = "#,##0"


def _brand_header(ws: Any, titulo: str, generado: str) -> None:
    ws["A1"] = "MUNDO HANA"
    ws["A1"].font = TITLE_FONT
    ws["A2"] = titulo
    ws["A2"].font = SUBTITLE_FONT
    ws["A3"] = f"Generado: {generado}  ·  HanaFlow Sistema de Inventario"
    ws["A3"].font = META_FONT


def _kpi_band(ws: Any, kpis: list[tuple[str, Any, str]], start_row: int = 5) -> None:
    """Banda de KPIs: (etiqueta, valor, formato-numero). Desde la columna B."""
    for i, (label, value, fmt) in enumerate(kpis):
        col = get_column_letter(2 + i)
        celda_label = ws[f"{col}{start_row}"]
        celda_valor = ws[f"{col}{start_row + 1}"]
        celda_label.value = label.upper()
        celda_label.font = KPI_LABEL_FONT
        celda_valor.value = value
        celda_valor.font = KPI_VALUE_FONT
        if fmt != "@" and isinstance(value, (int, float)):
            celda_valor.number_format = fmt
        for c in (celda_label, celda_valor):
            c.alignment = Alignment(horizontal="center")
            c.fill = PatternFill("solid", fgColor=ROW_ALT)
            c.border = BORDER
        ws.column_dimensions[col].width = 22


def _table(
    ws: Any,
    headers: list[str],
    rows: list[list[Any]],
    widths: list[int],
    header_row: int,
    money_cols: list[int] | None = None,
    int_cols: list[int] | None = None,
) -> int:
    """Tabla con header oscuro, zebra y bordes. Devuelve la última fila usada."""
    money_cols = money_cols or []
    int_cols = int_cols or []
    for j, name in enumerate(headers, start=1):
        celda = ws.cell(row=header_row, column=j, value=name)
        celda.font = HEADER_FONT
        celda.fill = HEADER_FILL
        celda.alignment = Alignment(horizontal="center", vertical="center")
        celda.border = BORDER
        ws.column_dimensions[get_column_letter(j)].width = widths[j - 1]
    ws.row_dimensions[header_row].height = 20

    for i, row in enumerate(rows):
        r = header_row + 1 + i
        for j, value in enumerate(row, start=1):
            celda = ws.cell(row=r, column=j, value=value)
            celda.border = BORDER
            if i % 2 == 1:
                celda.fill = PatternFill("solid", fgColor=ROW_ALT)
            if j in money_cols:
                celda.number_format = MONEY_FMT
            elif j in int_cols:
                celda.number_format = INT_FMT
    return header_row + len(rows)


def _status_rules(ws: Any, col: str, desde: int, hasta: int) -> None:
    rango = f"{col}{desde}:{col}{hasta}"
    ws.conditional_formatting.add(
        rango,
        CellIsRule(
            operator="equal",
            formula=['"BAJO"'],
            font=Font(bold=True, color=ALERT_RED),
            fill=PatternFill("solid", bgColor=ALERT_BG),
        ),
    )
    ws.conditional_formatting.add(
        rango,
        CellIsRule(
            operator="equal",
            formula=['"OK"'],
            font=Font(color=OK_GREEN),
            fill=PatternFill("solid", bgColor=OK_BG),
        ),
    )


def _movimientos_rules(ws: Any, col: str, desde: int, hasta: int) -> None:
    rango = f"{col}{desde}:{col}{hasta}"
    ws.conditional_formatting.add(
        rango,
        CellIsRule(
            operator="equal",
            formula=['"ENTRADA"'],
            font=Font(bold=True, color=OK_GREEN),
            fill=PatternFill("solid", bgColor=OK_BG),
        ),
    )
    ws.conditional_formatting.add(
        rango,
        CellIsRule(
            operator="equal",
            formula=['"SALIDA"'],
            font=Font(bold=True, color=ALERT_RED),
            fill=PatternFill("solid", bgColor=ALERT_BG),
        ),
    )


def _bytes(wb: Workbook) -> bytes:
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def inventario_xlsx(datos: list[dict], resumen: dict, generado: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Resumen"
    ws.sheet_view.showGridLines = False
    _brand_header(ws, "Reporte de Inventario — Resumen Ejecutivo", generado)
    _kpi_band(ws, [
        ("SKUs activos", resumen["skus"], INT_FMT),
        ("Unidades en stock", resumen["unidades"], INT_FMT),
        ("Valor inventario (Bs)", resumen["valor"], MONEY_FMT),
        ("Alertas stock bajo", resumen["alertas"], INT_FMT),
        ("Unidades por reponer", resumen["faltante"], INT_FMT),
    ])
    ws["B9"] = f"Umbral de stock mínimo: {resumen['minimo']} unidades por producto."
    ws["B9"].font = META_FONT

    ws2 = wb.create_sheet("Inventario")
    headers = [
        "Código", "Nombre", "Marca", "Categoría", "Pasillo",
        "Stock", "Precio", "Moneda", "Valor (Bs)", "Estado",
    ]
    filas = [
        [
            d["codigo"], d["nombre"], d["marca"], d["categoria"], d["pasillo"],
            d["stock"], d["precio"], d["moneda"], d["valor"], d["estado"],
        ]
        for d in datos
    ]
    ultima = _table(ws2, headers, filas, [14, 30, 14, 16, 9, 9, 11, 9, 13, 10], header_row=1, money_cols=[7, 9], int_cols=[6])
    _status_rules(ws2, "J", 2, ultima)
    ws2.freeze_panes = "A2"
    ws2.auto_filter.ref = f"A1:J{ultima}"
    return _bytes(wb)


def movimientos_xlsx(datos: list[dict], resumen: dict, generado: str, periodo: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Resumen"
    ws.sheet_view.showGridLines = False
    _brand_header(ws, "Reporte de Movimientos — Resumen Ejecutivo", generado)
    ws["A4"] = periodo
    ws["A4"].font = META_FONT
    _kpi_band(ws, [
        ("Entradas", resumen["entradas"], INT_FMT),
        ("Unidades entradas", resumen["unidades_in"], INT_FMT),
        ("Valor entradas (Bs)", resumen["total_in"], MONEY_FMT),
        ("Salidas", resumen["salidas"], INT_FMT),
        ("Unidades salidas", resumen["unidades_out"], INT_FMT),
        ("Valor salidas (Bs)", resumen["total_out"], MONEY_FMT),
    ], start_row=6)

    ws2 = wb.create_sheet("Movimientos")
    headers = ["Fecha", "Tipo", "Código", "Contraparte", "Producto", "Artículos", "Total (Bs)", "Estado"]
    filas = [
        [
            d["fecha"], d["tipo"], d["codigo"], d["contraparte"], d["producto"],
            d["articulos"], d["total"], d["estado"],
        ]
        for d in datos
    ]
    ultima = _table(ws2, headers, filas, [17, 10, 14, 22, 36, 9, 12, 13], header_row=1, money_cols=[7], int_cols=[6])
    _movimientos_rules(ws2, "B", 2, ultima)
    ws2.freeze_panes = "A2"
    ws2.auto_filter.ref = f"A1:H{ultima}"
    return _bytes(wb)


def valoracion_xlsx(datos: list[dict], total_valor: float, generado: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Valoración"
    ws.sheet_view.showGridLines = False
    _brand_header(ws, "Valoración del Inventario por Categoría", generado)

    headers = ["Categoría", "SKUs", "Unidades", "Valor (Bs)", "% del inventario"]
    filas = [
        [d["categoria"], d["skus"], d["unidades"], d["valor"], d["pct"] / 100]
        for d in datos
    ]
    ultima = _table(ws, headers, filas, [26, 10, 12, 16, 16], header_row=5, money_cols=[4], int_cols=[2, 3])
    for r in range(6, ultima + 1):
        ws.cell(row=r, column=5).number_format = "0.0%"

    r_total = ultima + 1
    ws.cell(row=r_total, column=1, value="TOTALES").font = TOTAL_FONT
    ws.cell(row=r_total, column=2, value=sum(d["skus"] for d in datos)).font = TOTAL_FONT
    ws.cell(row=r_total, column=3, value=sum(d["unidades"] for d in datos)).font = TOTAL_FONT
    c_valor = ws.cell(row=r_total, column=4, value=total_valor)
    c_valor.font = TOTAL_FONT
    c_valor.number_format = MONEY_FMT
    c_pct = ws.cell(row=r_total, column=5, value=1)
    c_pct.font = TOTAL_FONT
    c_pct.number_format = "0.0%"
    for j in range(1, 6):
        ws.cell(row=r_total, column=j).fill = TOTAL_FILL
        ws.cell(row=r_total, column=j).border = BORDER

    if datos:
        chart = BarChart()
        chart.type = "bar"
        chart.style = 10
        chart.title = "Valor del inventario por categoría (Bs)"
        chart.height = 9
        chart.width = 18
        chart.legend = None
        data = Reference(ws, min_col=4, min_row=6, max_row=ultima)
        cats = Reference(ws, min_col=1, min_row=6, max_row=ultima)
        chart.add_data(data, titles_from_data=False)
        chart.set_categories(cats)
        if chart.series:
            chart.series[0].graphicalProperties.solidFill = HANA_RED
        ws.add_chart(chart, f"G{5}")
    return _bytes(wb)
