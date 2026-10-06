"""Builder de libros XLSX ejecutivos (openpyxl) — diseño "Hana Slate 2027".

Estética corporativa ultra-limpia: cabecera carbón (#1E293B) con texto blanco
en negrita, tipografía Segoe UI (10 pt cabeceras / 9 pt datos / 10 pt totales),
filete gris-azado muy fino (#E2E8F0) en todas las celdas, zebra casi imperceptible
(#F8FAFC) sólo en filas pares, formatos contables sin decimales que ensanchan
columnas, auto-ajuste explícito de anchos y fit-to-print-width en los metadatos
de página. Sin barras de datos ni rellenos de marca: el color es sólo semántico
(tinta) y la jerarquía se resuelve con peso tipográfico.
"""

from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.properties import PageSetupProperties

# ===== Paleta "Hana Slate 2027" =====
CHARCOAL = "1E293B"     # cabecera: slate-900 profundo
SLATE_TEXT = "334155"   # texto secundario
INK = "0F172A"         # tinta principal (slate-950)
MUTED = "64748B"       # gris-azulado para notas/pie
BORDER_HEX = "E2E8F0"  # slate-200: filetes finos
ZEBRA_HEX = "F8FAFC"   # slate-50: tinte de filas pares
TOTAL_TINT = "F1F5F9"  # slate-100: banda de total consolidado
INT_TINT = "F1F5F9"    # columna Intervalo: igual de discreta
OK_GREEN = "059669"
ALERT_RED = "B91C1C"

UI = "Segoe UI"

# ===== Tipografía =====
BASE_FONT = Font(name=UI, size=9, color=INK)
HEADER_FONT = Font(name=UI, size=10, bold=True, color="FFFFFF")
TOTAL_FONT = Font(name=UI, size=10, bold=True, color=INK)
INT_FONT = Font(name=UI, size=9, bold=True, color=INK)
COMPANY_FONT = Font(name=UI, size=12, bold=True, color=CHARCOAL)
SUBTITLE_FONT = Font(name=UI, size=9, color=MUTED)
KPI_LABEL_FONT = Font(name=UI, size=8, bold=True, color=MUTED)
KPI_VALUE_FONT = Font(name=UI, size=13, bold=True, color=CHARCOAL)

# ===== Rellenos y bordes =====
HEADER_FILL = PatternFill(start_color=CHARCOAL, end_color=CHARCOAL, fill_type="solid")
ZEBRA_FILL = PatternFill(start_color=ZEBRA_HEX, end_color=ZEBRA_HEX, fill_type="solid")
TOTAL_FILL = PatternFill(start_color=TOTAL_TINT, end_color=TOTAL_TINT, fill_type="solid")
INT_FILL = PatternFill(start_color=INT_TINT, end_color=INT_TINT, fill_type="solid")

_SIDE = Side(border_style="thin", color=BORDER_HEX)
CELL_BORDER = Border(left=_SIDE, right=_SIDE, top=_SIDE, bottom=_SIDE)
TOTAL_BORDER = Border(
    left=_SIDE, right=_SIDE, bottom=_SIDE,
    top=Side(border_style="medium", color=CHARCOAL),
)

# ===== Formatos contables (sin decimales que ensanchan columnas) =====
MONEY_BS = '"Bs "#,##0'
MONEY_USD = '"$"#,##0'
INT_FMT = "#,##0"
PCT_FMT = "0.0%"

TABLE_HEADER_ROW = 6


def _ancho_display(valor: Any, fmt: str = "") -> int:
    """Longitud visual aproximada del CONTENIDO ya formateado.

    Un número con formato '#,##0' ocupa miles + separadores, no len(str(float));
    aquí se aproxima para que el auto-ajuste no degenere en columnas '###'.
    """
    if valor is None:
        return 0
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        if fmt == PCT_FMT:
            return 6
        entero = int(round(abs(valor)))
        digitos = len(f"{entero:,}")
        prefijo = 3 if fmt == MONEY_BS else 2 if fmt == MONEY_USD else 1 if valor < 0 else 0
        return digitos + prefijo
    return max(len(str(valor)), 0)


def _autofit(ws: Any, headers: list[str], filas: list[list[Any]],
             col_formats: dict[int, str], min_w: int = 6, max_w: int = 42,
             pad: float = 2.2) -> None:
    """Ancho explícito por columna = max(cabecera, contenido formateado) + pad."""
    for j, name in enumerate(headers, start=1):
        fmt = col_formats.get(j, "")
        largo = _ancho_display(name, "")
        for fila in filas:
            if j - 1 < len(fila):
                largo = max(largo, _ancho_display(fila[j - 1], fmt))
        ws.column_dimensions[get_column_letter(j)].width = round(min(max(largo + pad, min_w), max_w), 1)


def _letterhead(ws: Any, reporte: str, generado: str) -> None:
    """Filas 1-3: identificación minimalista carbón (sin logotipos gigantes)."""
    ws.merge_cells("A2:D2")
    razon = ws["A2"]
    razon.value = "MUNDO HANA, C.A."
    razon.font = COMPANY_FONT
    razon.alignment = Alignment(horizontal="left", vertical="center")

    ws.merge_cells("A3:F3")
    sub = ws["A3"]
    sub.value = f"{reporte} · Generado: {generado}"
    sub.font = SUBTITLE_FONT
    ws.row_dimensions[2].height = 20
    ws.row_dimensions[3].height = 14


def _kpi_band(ws: Any, kpis: list[tuple[str, Any, str]]) -> None:
    """Filas 4-5: etiquetas + valores KPI en bloques de 3 columnas, sin relleno."""
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
        if fmt:
            val.number_format = fmt
    ws.row_dimensions[4].height = 13
    ws.row_dimensions[5].height = 22


def _table(
    ws: Any,
    headers: list[str],
    filas: list[list[Any]],
    header_row: int = TABLE_HEADER_ROW,
    money_cols: list[int] | None = None,
    usd_cols: list[int] | None = None,
    int_cols: list[int] | None = None,
    pct_cols: list[int] | None = None,
    emphasis_cols: list[int] | None = None,
    total_row: bool = False,
) -> int:
    """Tabla Slate 2027: cabecera carbón, zebra #F8FAFC, filete fino total.

    Devuelve la última fila usada. `total_row=True` marca la ÚLTIMA fila de
    `filas` como TOTAL CONSOLIDADO (negrita 10 pt + banda F1F5F9).
    """
    money_cols = money_cols or []
    usd_cols = usd_cols or []
    int_cols = int_cols or []
    pct_cols = pct_cols or []
    emphasis_cols = emphasis_cols or []
    ncols = len(headers)

    col_formats: dict[int, str] = {}
    for j in money_cols:
        col_formats[j] = MONEY_BS
    for j in usd_cols:
        col_formats[j] = MONEY_USD
    for j in int_cols:
        col_formats[j] = INT_FMT
    for j in pct_cols:
        col_formats[j] = PCT_FMT

    # --- Cabecera ---
    for j, name in enumerate(headers, start=1):
        celda = ws.cell(row=header_row, column=j, value=name)
        celda.font = HEADER_FONT
        celda.fill = HEADER_FILL
        celda.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        celda.border = CELL_BORDER
    ws.row_dimensions[header_row].height = 24

    # --- Datos ---
    fila_total_idx = len(filas) - 1 if total_row else -1
    for i, fila in enumerate(filas):
        r = header_row + 1 + i
        es_total = i == fila_total_idx
        es_zebra = (i % 2 == 1) and not es_total
        for j in range(1, ncols + 1):
            value = fila[j - 1] if j - 1 < len(fila) else None
            celda = ws.cell(row=r, column=j, value=value)
            celda.border = TOTAL_BORDER if es_total else CELL_BORDER
            celda.font = TOTAL_FONT if es_total else BASE_FONT

            if es_total:
                celda.fill = TOTAL_FILL
            elif j in emphasis_cols:
                celda.fill = INT_FILL
                celda.font = INT_FONT
            elif es_zebra:
                celda.fill = ZEBRA_FILL

            if j in money_cols:
                celda.number_format = MONEY_BS
            elif j in usd_cols:
                celda.number_format = MONEY_USD
            elif j in pct_cols:
                celda.number_format = PCT_FMT
            elif j in int_cols:
                celda.number_format = INT_FMT

            centrar = j in money_cols or j in usd_cols or j in int_cols or j in pct_cols or j in emphasis_cols
            celda.alignment = Alignment(
                horizontal="center" if centrar else "left",
                vertical="center",
                wrap_text=(j == 1 and not es_total),
            )

    ultima = header_row + len(filas)

    _autofit(ws, headers, filas, col_formats)
    if emphasis_cols:
        for j in emphasis_cols:
            letra = get_column_letter(j)
            actual = ws.column_dimensions[letra].width or 10
            ws.column_dimensions[letra].width = round(min(max(actual + 1.5, 12), 44), 1)
    return ultima


def _status_rules(ws: Any, col: str, desde: int, hasta: int) -> None:
    """Color SÓLO de tinta (sin rellenos): OK verde, BAJO rojo."""
    rango = f"{col}{desde}:{col}{hasta}"
    ws.conditional_formatting.add(
        rango,
        CellIsRule(operator="equal", formula=['"BAJO"'],
                   font=Font(name=UI, size=9, bold=True, color=ALERT_RED)),
    )
    ws.conditional_formatting.add(
        rango,
        CellIsRule(operator="equal", formula=['"OK"'],
                   font=Font(name=UI, size=9, color=OK_GREEN)),
    )


def _movimientos_rules(ws: Any, col: str, desde: int, hasta: int) -> None:
    rango = f"{col}{desde}:{col}{hasta}"
    ws.conditional_formatting.add(
        rango,
        CellIsRule(operator="equal", formula=['"ENTRADA"'],
                   font=Font(name=UI, size=9, bold=True, color=OK_GREEN)),
    )
    ws.conditional_formatting.add(
        rango,
        CellIsRule(operator="equal", formula=['"SALIDA"'],
                   font=Font(name=UI, size=9, bold=True, color=ALERT_RED)),
    )


def _print_setup(ws: Any, reporte: str, header_row: int = TABLE_HEADER_ROW) -> None:
    """Fit-to-page-width nativo en los metadatos del libro (no sólo en el PDF)."""
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = 1  # Carta (Letter)
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = f"{header_row}:{header_row}"
    ws.page_margins.left = ws.page_margins.right = 0.4
    ws.page_margins.top = ws.page_margins.bottom = 0.6
    ws.oddFooter.left.text = f"Hana · {reporte}"
    ws.oddFooter.left.size = 8
    ws.oddFooter.left.color = MUTED
    ws.oddFooter.right.text = "Página &P de &N"
    ws.oddFooter.right.size = 8
    ws.oddFooter.right.color = MUTED


def _props(wb: Workbook, titulo: str) -> None:
    wb.properties.creator = "Hana — Mundo Hana, C.A."
    wb.properties.lastModifiedBy = "Hana — Mundo Hana, C.A."
    wb.properties.title = titulo


def _bytes(wb: Workbook) -> bytes:
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ------------------------------------------------------------------ #
#  Reportes públicos                                                  #
# ------------------------------------------------------------------ #

def inventario_xlsx(datos: list[dict], resumen: dict, generado: str) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventario"
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = CHARCOAL

    _letterhead(ws, "Reporte de Inventario", generado)
    _kpi_band(ws, [
        ("SKUS ACTIVOS", resumen["skus"], INT_FMT),
        ("STOCK TOTAL (UDS)", resumen["unidades"], INT_FMT),
        ("VALOR INVENTARIO (Bs)", round(resumen["valor"], 2), MONEY_BS),
        ("ALERTAS BAJO MÍNIMO", sum(1 for d in datos if d["estado"] == "BAJO"), INT_FMT),
    ])

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
    ultima = _table(ws, headers, filas, money_cols=[7, 9], int_cols=[6], emphasis_cols=[5])
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
    ws.sheet_properties.tabColor = CHARCOAL

    _letterhead(ws, f"Reporte de Movimientos · {periodo}", generado)
    _kpi_band(ws, [
        ("ENTRADAS", resumen["entradas"], INT_FMT),
        ("SALIDAS", resumen["salidas"], INT_FMT),
        ("UNIDADES IN/OUT", f"{resumen['unidades_in']} / {resumen['unidades_out']}", ""),
        ("NETO (Bs)", round(resumen["total_in"] - resumen["total_out"], 2), MONEY_BS),
    ])

    headers = ["Fecha", "Tipo", "Código", "Contraparte", "Producto", "Artículos", "Total (Bs)", "Estado"]
    filas = [
        [
            d["fecha"], d["tipo"], d["codigo"], d["contraparte"], d["producto"],
            d["articulos"], d["total"], d["estado"],
        ]
        for d in datos
    ]
    ultima = _table(ws, headers, filas, money_cols=[7], int_cols=[6], emphasis_cols=[1])
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
    ws.sheet_properties.tabColor = CHARCOAL

    _letterhead(ws, "Valoración del Inventario por Categoría", generado)
    _kpi_band(ws, [
        ("CATEGORÍAS", len(datos), INT_FMT),
        ("SKUs", sum(d["skus"] for d in datos), INT_FMT),
        ("UNIDADES", sum(d["unidades"] for d in datos), INT_FMT),
        ("VALOR TOTAL (Bs)", round(total_valor, 2), MONEY_BS),
    ])

    headers = ["Categoría", "SKUs", "Unidades", "Valor (Bs)", "% del inventario"]
    filas = [
        [d["categoria"], d["skus"], d["unidades"], d["valor"], d["pct"] / 100]
        for d in datos
    ]
    filas.append([
        "TOTAL CONSOLIDADO",
        sum(d["skus"] for d in datos),
        sum(d["unidades"] for d in datos),
        total_valor,
        1,
    ])
    ultima = _table(ws, headers, filas, money_cols=[4], int_cols=[2, 3],
                    pct_cols=[5], total_row=True)

    ws.freeze_panes = f"A{TABLE_HEADER_ROW + 1}"
    ws.auto_filter.ref = f"A{TABLE_HEADER_ROW}:E{ultima - 1}"
    _print_setup(ws, "Valoración por Categoría")
    _props(wb, "Valoración por Categoría")
    return _bytes(wb)


def estadisticas_xlsx(datos: list[dict], generado: str, periodo: str) -> bytes:
    """Corte de Estadísticas de Inventario — 17 columnas estilo RD-026.

    `datos`: dicts con claves desc, deposito, intervalo y las 13 columnas de
    movimientos + saldo_fin. Se añade fila TOTAL CONSOLIDADO sumando lo numérico
    y la columna Intervalo se mantiene explícita (negrita + tinte F1F5F9).
    """
    claves_num = [
        "saldo_ini", "compra", "devcom", "recepcion", "transferencia", "traslado",
        "ajuste", "inv_fisico", "venta", "devol", "nota_entrega", "produccion",
        "nota_devcom", "saldo_fin",
    ]
    headers = [
        "Descripción", "Depósito", "Intervalo",
        "Saldo Ini", "Compra", "Devcom", "Recepción", "Transferencia", "Traslado",
        "Ajuste", "Inv. Físico", "Venta", "Devol", "Nota Entrega", "Producción",
        "Nota Devcom", "Saldo Fin",
    ]

    filas: list[list[Any]] = [
        [d.get("desc", ""), d.get("deposito", ""), d.get("intervalo", "")]
        + [int(d.get(k) or 0) for k in claves_num]
        for d in datos
    ]
    total = ["TOTAL CONSOLIDADO", "—", _modo_intervalo(datos)] + [
        sum(int(d.get(k) or 0) for d in datos) for k in claves_num
    ]
    filas.append(total)

    wb = Workbook()
    ws = wb.active
    ws.title = "Estadísticas"
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = CHARCOAL

    _letterhead(ws, f"Estadísticas de Inventario · {periodo}", generado)
    _kpi_band(ws, [
        ("LÍNEAS", len(datos), INT_FMT),
        ("SALDO FIN (UDS)", total[-1], INT_FMT),
        ("MOVIMIENTOS NETOS", sum(total[3:-1]), INT_FMT),
    ])

    int_cols = list(range(4, 18))  # las 14 columnas numéricas
    ultima = _table(ws, headers, filas, int_cols=int_cols,
                    emphasis_cols=[3, 17], total_row=True)

    ws.freeze_panes = f"D{TABLE_HEADER_ROW + 1}"
    ws.auto_filter.ref = f"A{TABLE_HEADER_ROW}:Q{ultima - 1}"

    # Negativos en rojo contable, sólo tinta, en toda la zona numérica.
    ws.conditional_formatting.add(
        f"D{TABLE_HEADER_ROW + 1}:Q{ultima}",
        CellIsRule(operator="lessThan", formula=["0"],
                   font=Font(name=UI, size=9, color=ALERT_RED)),
    )

    _print_setup(ws, f"Estadísticas · {periodo}")
    _props(wb, "Estadísticas de Inventario")
    return _bytes(wb)


def _modo_intervalo(datos: list[dict]) -> str:
    """Etiqueta del Intervalo para la fila total (el periodo más repetido)."""
    valores = [str(d.get("intervalo", "")) for d in datos if d.get("intervalo")]
    if not valores:
        return "—"
    mejor = max(set(valores), key=valores.count)
    return mejor
