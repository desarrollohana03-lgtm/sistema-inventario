"""Builder de libros XLSX ejecutivos (openpyxl): hojas de datos puras y formateadas."""

from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.properties import PageSetupProperties

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
HEADER_BORDER = Border(
    left=_thin, right=_thin, top=_thin, bottom=Side(style="thick", color=HANA_RED)
)
TOTAL_FONT = Font(bold=True, size=10, color=HANA_DARK)
TOTAL_FILL = PatternFill("solid", fgColor="F4F4F5")

MONEY_FMT = "#,##0.00"
INT_FMT = "#,##0"


def _table(
    ws: Any,
    headers: list[str],
    rows: list[list[Any]],
    widths: list[int],
    header_row: int = 1,
    money_cols: list[int] | None = None,
    int_cols: list[int] | None = None,
) -> int:
    """Tabla con header oscuro + filete rojo, zebra y bordes suaves. Devuelve
    la ultima fila usada."""
    money_cols = money_cols or []
    int_cols = int_cols or []
    for j, name in enumerate(headers, start=1):
        celda = ws.cell(row=header_row, column=j, value=name)
        celda.font = HEADER_FONT
        celda.fill = HEADER_FILL
        celda.alignment = Alignment(horizontal="center", vertical="center")
        celda.border = HEADER_BORDER
        ws.column_dimensions[get_column_letter(j)].width = widths[j - 1]
    ws.row_dimensions[header_row].height = 24

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


def _print_setup(ws: Any, reporte: str, header_row: int = 1) -> None:
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = 9  # A4
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = f"{header_row}:{header_row}"
    ws.oddFooter.left.text = f"HanaStock · {reporte}"
    ws.oddFooter.left.size = 8
    ws.oddFooter.left.color = HANA_MUTED
    ws.oddFooter.right.text = "Página &P de &N"
    ws.oddFooter.right.size = 8
    ws.oddFooter.right.color = HANA_MUTED


def _props(wb: Workbook, titulo: str) -> None:
    wb.properties.creator = "HanaStock"
    wb.properties.lastModifiedBy = "HanaStock"
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
    _status_rules(ws, "J", 2, ultima)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:J{ultima}"
    _print_setup(ws, "Reporte de Inventario")
    _props(wb, "Reporte de Inventario")
    return _bytes(wb)


def movimientos_xlsx(datos: list[dict], resumen: dict, generado: str, periodo: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Movimientos"
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = HANA_RED
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
    _movimientos_rules(ws, "B", 2, ultima)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:H{ultima}"
    _print_setup(ws, "Reporte de Movimientos")
    _props(wb, "Reporte de Movimientos")
    return _bytes(wb)


def valoracion_xlsx(datos: list[dict], total_valor: float, generado: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Valoración"
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = HANA_RED
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
    for r in range(2, ultima + 1):
        ws.cell(row=r, column=5).number_format = "0.0%"

    for j in range(1, 6):
        celda = ws.cell(row=ultima, column=j)
        celda.font = TOTAL_FONT
        celda.fill = TOTAL_FILL
        celda.border = Border(
            left=_thin, right=_thin, bottom=_thin,
            top=Side(style="medium", color=HANA_DARK),
        )

    if datos:
        ws.conditional_formatting.add(
            f"E2:E{ultima - 1}",
            DataBarRule(
                start_type="num", start_value=0,
                end_type="num", end_value=1,
                color="F43F5E", showValue=True,
            ),
        )
    _print_setup(ws, "Valoración por Categoría")
    _props(wb, "Valoración por Categoría")
    return _bytes(wb)
