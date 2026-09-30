"""Builder de libros XLSX ejecutivos (openpyxl) — diseño "Hana Editorial".

Membrete rojo, banda de KPIs, doble filete rojo bajo cabeceras, hairlines
horizontales, formato contable y color solo semántico (sin rellenos de marca).
"""

from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.properties import PageSetupProperties

HANA_RED = "E11D48"
HANA_LOGO_RED = "A6192E"
HANA_DARK = "121214"
HANA_MUTED = "8B8B93"
OK_GREEN = "059669"
ALERT_RED = "B91C1C"
WARN_AMBER = "92400E"

_hair = Side(style="hair", color="A1A1AA")
BORDER = Border(bottom=_hair)
HEADER_BORDER = Border(bottom=Side(style="double", color=HANA_RED))
TOTAL_BORDER = Border(top=Side(style="double", color=HANA_RED))

UI = "Segoe UI"
BASE_FONT = Font(name=UI, size=10, color="18181B")
HEADER_FONT = Font(name=UI, size=10, bold=True, color=HANA_DARK)
TOTAL_FONT = Font(name=UI, size=10, bold=True, color=HANA_DARK)
LOGO_FONT = Font(name="Georgia", size=54, bold=True, color=HANA_LOGO_RED)
COMPANY_FONT = Font(name=UI, size=11, bold=True, color=HANA_DARK)
SUBTITLE_FONT = Font(name=UI, size=9, italic=True, color=HANA_MUTED)
KPI_LABEL_FONT = Font(name=UI, size=8, bold=True, color=HANA_MUTED)
KPI_VALUE_FONT = Font(name=UI, size=14, bold=True, color=HANA_DARK)

MONEY_FMT = '#,##0.00;[Red](#,##0.00);"-"'
INT_FMT = '#,##0;[Red](#,##0);"-"'
PCT_FMT = "0.0%"

TABLE_HEADER_ROW = 6


def _letterhead(ws: Any, reporte: str, generado: str) -> None:
    """Filas 1-3: logo serif rojo + razón social + subtítulo con fecha."""
    ws.merge_cells("A1:D1")
    logo = ws["A1"]
    logo.value = "Hana"
    logo.font = LOGO_FONT
    logo.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 66

    ws.merge_cells("A2:D2")
    razon = ws["A2"]
    razon.value = "MUNDO HANA, C.A."
    razon.font = COMPANY_FONT
    razon.alignment = Alignment(horizontal="center")

    ws.merge_cells("A3:F3")
    sub = ws["A3"]
    sub.value = f"{reporte} · Generado: {generado}"
    sub.font = SUBTITLE_FONT


def _kpi_band(ws: Any, kpis: list[tuple[str, Any, str]]) -> None:
    """Filas 4-5: etiquetas + valores KPI en bloques combinados de 3 columnas."""
    for i, (label, value, fmt) in enumerate(kpis):
        c1 = 1 + i * 3
        c2 = c1 + 2
        ws.merge_cells(start_row=4, start_column=c1, end_row=4, end_column=c2)
        lbl = ws.cell(row=4, column=c1, value=label)
        lbl.font = KPI_LABEL_FONT
        lbl.alignment = Alignment(horizontal="center", vertical="bottom")
        ws.merge_cells(start_row=5, start_column=c1, end_row=5, end_column=c2)
        val = ws.cell(row=5, column=c1, value=value)
        val.font = KPI_VALUE_FONT
        val.alignment = Alignment(horizontal="center", vertical="center")
        val.border = BORDER
        if fmt:
            val.number_format = fmt
    ws.row_dimensions[4].height = 14
    ws.row_dimensions[5].height = 24


def _table(
    ws: Any,
    headers: list[str],
    rows: list[list[Any]],
    widths: list[int],
    header_row: int = TABLE_HEADER_ROW,
    money_cols: list[int] | None = None,
    int_cols: list[int] | None = None,
) -> int:
    """Tabla editorial: header sin relleno con doble filete rojo, hairlines
    por fila, números a la derecha. Devuelve la ultima fila usada."""
    money_cols = money_cols or []
    int_cols = int_cols or []
    for j, name in enumerate(headers, start=1):
        celda = ws.cell(row=header_row, column=j, value=name)
        celda.font = HEADER_FONT
        celda.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        celda.border = HEADER_BORDER
        ws.column_dimensions[get_column_letter(j)].width = widths[j - 1]
    ws.row_dimensions[header_row].height = 26

    for i, row in enumerate(rows):
        r = header_row + 1 + i
        for j, value in enumerate(row, start=1):
            celda = ws.cell(row=r, column=j, value=value)
            celda.font = BASE_FONT
            celda.border = BORDER
            celda.alignment = Alignment(vertical="center")
            if j in money_cols:
                celda.number_format = MONEY_FMT
                celda.alignment = Alignment(horizontal="center", vertical="center")
            elif j in int_cols:
                celda.number_format = INT_FMT
                celda.alignment = Alignment(horizontal="center", vertical="center")
    return header_row + len(rows)


def _totals_style(ws: Any, row: int, ncols: int) -> None:
    for j in range(1, ncols + 1):
        celda = ws.cell(row=row, column=j)
        celda.font = TOTAL_FONT
        celda.border = TOTAL_BORDER


def _status_rules(ws: Any, col: str, desde: int, hasta: int) -> None:
    rango = f"{col}{desde}:{col}{hasta}"
    ws.conditional_formatting.add(
        rango,
        CellIsRule(
            operator="equal", formula=['"BAJO"'],
            font=Font(name=UI, size=10, bold=True, color=ALERT_RED),
        ),
    )
    ws.conditional_formatting.add(
        rango,
        CellIsRule(
            operator="equal", formula=['"OK"'],
            font=Font(name=UI, size=10, color=OK_GREEN),
        ),
    )


def _movimientos_rules(ws: Any, col: str, desde: int, hasta: int) -> None:
    rango = f"{col}{desde}:{col}{hasta}"
    ws.conditional_formatting.add(
        rango,
        CellIsRule(
            operator="equal", formula=['"ENTRADA"'],
            font=Font(name=UI, size=10, bold=True, color=OK_GREEN),
        ),
    )
    ws.conditional_formatting.add(
        rango,
        CellIsRule(
            operator="equal", formula=['"SALIDA"'],
            font=Font(name=UI, size=10, bold=True, color=ALERT_RED),
        ),
    )


def _print_setup(ws: Any, reporte: str, header_row: int = TABLE_HEADER_ROW) -> None:
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = 9  # A4
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = f"1:{header_row}"
    ws.page_margins.left = ws.page_margins.right = 0.4
    ws.page_margins.top = ws.page_margins.bottom = 0.6
    ws.oddFooter.left.text = f"Hana · {reporte}"
    ws.oddFooter.left.size = 8
    ws.oddFooter.left.color = HANA_MUTED
    ws.oddFooter.right.text = "Página &P de &N"
    ws.oddFooter.right.size = 8
    ws.oddFooter.right.color = HANA_MUTED


def _props(wb: Workbook, titulo: str) -> None:
    wb.properties.creator = "Hana — Mundo Hana, C.A."
    wb.properties.lastModifiedBy = "Hana — Mundo Hana, C.A."
    wb.properties.title = titulo


def _bytes(wb: Workbook) -> bytes:
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def inventario_xlsx(datos: list[dict], resumen: dict, generado: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Inventario"
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = HANA_RED
    _letterhead(ws, "Reporte de Inventario", generado)
    _kpi_band(ws, [
        ("SKUs ACTIVOS", resumen["skus"], INT_FMT),
        ("STOCK TOTAL (UDS)", resumen["unidades"], INT_FMT),
        ("VALOR INVENTARIO (Bs)", round(resumen["valor"], 2), MONEY_FMT),
        ("ALERTAS BAJO MÍNIMO", sum(1 for d in datos if d["estado"] == "BAJO"), INT_FMT),
    ])
    headers = [
        "Código", "Nombre", "Marca", "Categoría", "Pasillo",
        "Stock", "Precio", "Moneda", "Valor (Bs)", "Estado",
    ]
    widths = [16, 30, 14, 16, 11, 11, 13, 12, 14, 12]
    filas = [
        [
            d["codigo"], d["nombre"], d["marca"], d["categoria"], d["pasillo"],
            d["stock"], d["precio"], d["moneda"], d["valor"], d["estado"],
        ]
        for d in datos
    ]
    ultima = _table(ws, headers, filas, widths, money_cols=[7, 9], int_cols=[6])
    _status_rules(ws, "J", TABLE_HEADER_ROW + 1, ultima)
    ws.freeze_panes = f"A{TABLE_HEADER_ROW + 1}"
    ws.auto_filter.ref = f"A{TABLE_HEADER_ROW}:J{ultima}"
    _print_setup(ws, "Reporte de Inventario")
    _props(wb, "Reporte de Inventario")
    return _bytes(wb)


def movimientos_xlsx(datos: list[dict], resumen: dict, generado: str, periodo: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Movimientos"
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = HANA_RED
    _letterhead(ws, f"Reporte de Movimientos · {periodo}", generado)
    _kpi_band(ws, [
        ("ENTRADAS", resumen["entradas"], INT_FMT),
        ("SALIDAS", resumen["salidas"], INT_FMT),
        ("UNIDADES IN/OUT", f"{resumen['unidades_in']} / {resumen['unidades_out']}", ""),
        ("NETO (Bs)", round(resumen["total_in"] - resumen["total_out"], 2), MONEY_FMT),
    ])
    headers = ["Fecha", "Tipo", "Código", "Contraparte", "Producto", "Artículos", "Total (Bs)", "Estado"]
    widths = [17, 11, 14, 22, 36, 12, 13, 13]
    filas = [
        [
            d["fecha"], d["tipo"], d["codigo"], d["contraparte"], d["producto"],
            d["articulos"], d["total"], d["estado"],
        ]
        for d in datos
    ]
    ultima = _table(ws, headers, filas, widths, money_cols=[7], int_cols=[6])
    _movimientos_rules(ws, "B", TABLE_HEADER_ROW + 1, ultima)
    ws.freeze_panes = f"A{TABLE_HEADER_ROW + 1}"
    ws.auto_filter.ref = f"A{TABLE_HEADER_ROW}:H{ultima}"
    _print_setup(ws, "Reporte de Movimientos")
    _props(wb, "Reporte de Movimientos")
    return _bytes(wb)


def valoracion_xlsx(datos: list[dict], total_valor: float, generado: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Valoración"
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = HANA_RED
    _letterhead(ws, "Valoración del Inventario por Categoría", generado)
    _kpi_band(ws, [
        ("CATEGORÍAS", len(datos), INT_FMT),
        ("SKUs", sum(d["skus"] for d in datos), INT_FMT),
        ("UNIDADES", sum(d["unidades"] for d in datos), INT_FMT),
        ("VALOR TOTAL (Bs)", round(total_valor, 2), MONEY_FMT),
    ])
    headers = ["Categoría", "SKUs", "Unidades", "Valor (Bs)", "% del inventario"]
    filas = [
        [d["categoria"], d["skus"], d["unidades"], d["valor"], d["pct"] / 100]
        for d in datos
    ]
    filas.append([
        "TOTALES",
        sum(d["skus"] for d in datos),
        sum(d["unidades"] for d in datos),
        total_valor,
        1,
    ])
    ultima = _table(ws, headers, filas, [26, 11, 13, 16, 17], money_cols=[4], int_cols=[2, 3])
    for r in range(TABLE_HEADER_ROW + 1, ultima + 1):
        ws.cell(row=r, column=5).number_format = PCT_FMT

    _totals_style(ws, ultima, 5)
    ws.freeze_panes = f"A{TABLE_HEADER_ROW + 1}"
    ws.auto_filter.ref = f"A{TABLE_HEADER_ROW}:E{ultima - 1}"

    if datos:
        ws.conditional_formatting.add(
            f"E{TABLE_HEADER_ROW + 1}:E{ultima - 1}",
            DataBarRule(
                start_type="num", start_value=0,
                end_type="num", end_value=1,
                color="F43F5E", showValue=True,
            ),
        )
    _print_setup(ws, "Valoración por Categoría")
    _props(wb, "Valoración por Categoría")
    return _bytes(wb)
