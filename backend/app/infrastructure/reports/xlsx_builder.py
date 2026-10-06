"""Builder de libros XLSX ejecutivos (openpyxl) — "Hana Slate 2026".

Especificación de diseño (radical, anti-recorte):
  1. Anchos ABSOLUTOS por columna: max(longitud_contenido_formateado + 5, 14).
     Ningún texto o cabecera puede recortarse, solaparse o quedar en "###".
  2. Alturas con aire: filas 1-5 (membrete + bloque de KPIs) = 28 pt,
     cabecera de tabla (fila 6) = 26 pt, filas de datos = 20 pt.
  3. Tipografía global Segoe UI. KPIs en BLOQUES aislados: etiqueta 9 pt
     MAYÚSCULAS gris #64748B sobre número 16 pt bold centrado, banda clara.
  4. Cabecera de tabla #0F172A con texto blanco en negrita; zebra #F8FAFC en
     filas pares; filete ultra-fino #CBD5E1 en toda la rejilla (nunca negro).
  5. Números limpios: enteros "#,##0", moneda '"Bs "#,##0', % "0.0%".
     El CERO se dibuja como guión tenue (tercera sección del formato), sin
     decimales residuales.
  6. Metadatos nativos de impresión: fit-to-page, ancho = 1 página,
     A4 VERTICAL (auto-escala de Excel, sin recortar el borde derecho).

API pública estable (consumida por app/web/routers/reportes_api.py):
  inventario_xlsx(datos, resumen, generado)
  movimientos_xlsx(datos, resumen, generado, periodo)
  valoracion_xlsx(datos, total_valor, generado)
  estadisticas_xlsx(datos, generado, periodo)
"""

from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.properties import PageSetupProperties

# ===== Paleta "Hana Slate 2026" =====
SLATE_950 = "0F172A"    # cabecera de tabla + tinta principal
MUTED = "64748B"        # etiquetas KPI / texto secundario (slate-500)
CAPTION = "94A3B8"      # leyendas (slate-400)
BORDER_HEX = "CBD5E1"   # filete ultra-fino (slate-300)
ZEBRA_HEX = "F8FAFC"    # filas pares (slate-50)
TINT_HEX = "F1F5F9"     # banda KPI / Intervalo / Saldo Fin / TOTAL (slate-100)
OK_GREEN = "059669"
ALERT_RED = "B91C1C"
HANA_RED = "A6192E"      # rojo OFICIAL del wordmark (muestreado de hana-wordmark-red.png)
NEGRO = "000000"         # razón social

# ===== Paleta de TARJETAS KPI (sección superior, monocroma) =====
WHITE = "FFFFFF"         # lienzo que anula las gridlines tras las tarjetas
CARD_MUTED = "374151"    # etiqueta 9pt bold (gray-700, oscura)
CARD_CARBON = "0F172A"   # número 18pt bold (carbon)
CARD_LINE = "D1D5DB"     # filete fino de caja de tarjeta (gray-300)

UI = "Segoe UI"

# ===== Tipografía =====
BASE_FONT = Font(name=UI, size=9, color=SLATE_950)
HEADER_FONT = Font(name=UI, size=10, bold=True, color="FFFFFF")
TOTAL_FONT = Font(name=UI, size=10, bold=True, color=SLATE_950)
INT_FONT = Font(name=UI, size=9, bold=True, color=SLATE_950)
LOGO_FONT = Font(name="Playfair Display Black", size=32, bold=True, color=HANA_RED)
COMPANY_FONT = Font(name=UI, size=10, bold=True, color=NEGRO)
SUBTITLE_FONT = Font(name=UI, size=9, color=MUTED)
KPI_LABEL_FONT = Font(name=UI, size=9, bold=True, color=CARD_MUTED)
KPI_VALUE_FONT = Font(name=UI, size=16, bold=True, color=CARD_CARBON)
KPI_CAP_FONT = Font(name=UI, size=8, italic=True, color=CAPTION)

# ===== Rellenos =====
HEADER_FILL = PatternFill(start_color=SLATE_950, end_color=SLATE_950, fill_type="solid")
ZEBRA_FILL = PatternFill(start_color=ZEBRA_HEX, end_color=ZEBRA_HEX, fill_type="solid")
TINT_FILL = PatternFill(start_color=TINT_HEX, end_color=TINT_HEX, fill_type="solid")
WHITE_FILL = PatternFill(start_color=WHITE, end_color=WHITE, fill_type="solid")

# ===== Filetes: ultra-finos, jamás negros =====
_SIDE = Side(border_style="thin", color=BORDER_HEX)
CELL_BORDER = Border(left=_SIDE, right=_SIDE, top=_SIDE, bottom=_SIDE)
TOTAL_BORDER = Border(
    left=_SIDE, right=_SIDE, bottom=_SIDE,
    top=Side(border_style="medium", color=SLATE_950),
)
_CARD_SIDE = Side(border_style="thin", color=CARD_LINE)
CARD_BOX = Border(left=_CARD_SIDE, right=_CARD_SIDE, top=_CARD_SIDE, bottom=_CARD_SIDE)

# ===== Formatos numáticos limpios: cero -> guión tenue (3ª sección) =====
INT_FMT = '#,##0;[Red](#,##0);"–"'
MONEY_BS = '"Bs "#,##0;[Red](#,##0);"–"'
MONEY_USD = '"$"#,##0;[Red](#,##0);"–"'
PCT_FMT = '0.0%;[Red](0.0%);"–"'

TABLE_HEADER_ROW = 6
HEIGHT_METRIC_ROW = 24.0   # filas 2-5: padding interno de las tarjetas KPI
HEIGHT_HEADER_ROW = 26.0
HEIGHT_DATA_ROW = 20.0
WIDTH_MIN = 14.0
WIDTH_PAD = 5.0


# ------------------------------------------------------------------ #
#  Utilidades de medición y espaciado                                 #
# ------------------------------------------------------------------ #

def _len_display(valor: Any, fmt: str) -> int:
    """Longitud visual del contenido YA FORMATEADO (miles + prefijos)."""
    if valor is None:
        return 0
    if isinstance(valor, bool):
        return 5
    if isinstance(valor, (int, float)):
        if fmt == PCT_FMT:
            return 6  # "-33.3%"
        entero = int(round(abs(valor)))
        digitos = len(f"{entero:,}")          # 1,234,567 -> 9
        prefijo = 4 if fmt == MONEY_BS else 3 if fmt == MONEY_USD else 1 if valor < 0 else 0
        return digitos + prefijo
    return len(str(valor))


def _aplicar_anchos(ws: Any, headers: list[str], filas: list[list[Any]],
                    col_formats: dict[int, str]) -> None:
    """Ancho ABSOLUTO por columna: max(contenido + pad, mínimo 14).

    Se calcula sobre el contenido formateado, no sobre len(str(float)), para
    que "1,234,567" o "Bs 12,345" nunca desborden la columna (adiós "###").
    """
    for j, name in enumerate(headers, start=1):
        fmt = col_formats.get(j, "")
        largo = len(str(name))
        for fila in filas:
            if j - 1 < len(fila):
                largo = max(largo, _len_display(fila[j - 1], fmt))
        ws.column_dimensions[get_column_letter(j)].width = max(largo + WIDTH_PAD, WIDTH_MIN)


def _alturas(ws: Any, desde_datos: int, hasta_datos: int) -> None:
    """Fila 1 = 44 pt (wordmark), filas 2-5 = 24 pt (tarjetas KPI),
    cabecera de tabla = 26 pt, datos = 20 pt."""
    ws.row_dimensions[1].height = 44.0
    for r in range(2, 6):
        ws.row_dimensions[r].height = HEIGHT_METRIC_ROW
    ws.row_dimensions[TABLE_HEADER_ROW].height = HEIGHT_HEADER_ROW
    for r in range(desde_datos, hasta_datos + 1):
        ws.row_dimensions[r].height = HEIGHT_DATA_ROW


# ------------------------------------------------------------------ #
#  Secciones de la hoja                                               #
# ------------------------------------------------------------------ #

def _letterhead(ws: Any, reporte: str, generado: str) -> None:
    """Fila 1: wordmark "Hana" 32pt rojo oficial del logo + razón social en
    negro (10pt, jerarquía menor) + reporte/fecha en gris a la derecha."""
    ws.merge_cells("A1:B1")
    logo = ws["A1"]
    logo.value = "Hana"
    logo.font = LOGO_FONT
    logo.alignment = Alignment(horizontal="left", vertical="center")

    ws.merge_cells("C1:E1")
    razon = ws["C1"]
    razon.value = "MUNDO HANA, C.A."
    razon.font = COMPANY_FONT
    razon.alignment = Alignment(horizontal="left", vertical="center")

    ws.merge_cells("F1:H1")
    sub = ws["F1"]
    sub.value = f"{reporte} · Generado: {generado}"
    sub.font = SUBTITLE_FONT
    sub.alignment = Alignment(horizontal="right", vertical="center")


def _kpi_band(ws: Any, kpis: list[tuple[str, Any, str, str]]) -> None:
    """Filas 2-5: bloque ejecutivo de TARJETAS monocromas.

    1. Lienzo blanco puro en filas 2-5 (columnas A-Q): anula por completo las
       gridlines de Excel detrás de las tarjetas.
    2. Merges originales conservados (bloque de 3 columnas por KPI, filas 2-4):
       fila 2 = ETIQUETA 9pt bold gris oscuro #374151 · fila 3 = NÚMERO 16pt bold
       carbon #0F172A centrado bajo su etiqueta · fila 4 = caption 8pt itálica.
    3. Caja elegante: filete fino gris #D1D5DB alrededor de cada tarjeta
       (superior en fila 2, laterales en 2-4, inferior en fila 4).
    4. Padding interno perfecto: alto de filas 2-4 fijado a 24 pt.
    No escribe por debajo de la fila 5: la tabla, sus anchos y sus cálculos
    quedan intactos.
    """
    for r in range(2, 6):
        for c in range(1, 18):
            ws.cell(row=r, column=c).fill = WHITE_FILL

    for i, (label, value, fmt, caption) in enumerate(kpis):
        c1 = 1 + i * 3
        c2 = c1 + 2
        for cc in range(c1, c2 + 1):
            letra = get_column_letter(cc)
            actual = ws.column_dimensions[letra].width
            if actual is None or actual < WIDTH_MIN:
                ws.column_dimensions[letra].width = WIDTH_MIN
            # El filete se aplica ANTES del merge: openpyxl normaliza los
            # bordes internos y deja un contorno exterior limpio D1D5DB.
            for r in (2, 3, 4):
                ws.cell(row=r, column=cc).border = CARD_BOX

        lbl = ws.cell(row=2, column=c1, value=str(label).upper())
        lbl.font = KPI_LABEL_FONT
        lbl.alignment = Alignment(horizontal="center", vertical="center")

        val = ws.cell(row=3, column=c1, value=value)
        val.font = KPI_VALUE_FONT
        val.alignment = Alignment(horizontal="center", vertical="center")
        if fmt:
            val.number_format = fmt

        cap = ws.cell(row=4, column=c1, value=caption)
        cap.font = KPI_CAP_FONT
        cap.alignment = Alignment(horizontal="center", vertical="center")

        for r in (2, 3, 4):
            ws.merge_cells(start_row=r, start_column=c1, end_row=r, end_column=c2)


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
    """Rejilla 2026: cabecera slate con blanco, zebra faint, filete fino.

    `emphasis_cols` (Intervalo/Saldo Fin/Pasillo) reciben banda TINT + negrita
    para leerse de un vistazo. `total_row=True` estiliza la última fila de
    `filas` como TOTAL CONSOLIDADO. Devuelve la última fila usada.
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

    for j, name in enumerate(headers, start=1):
        celda = ws.cell(row=header_row, column=j, value=name)
        celda.font = HEADER_FONT
        celda.fill = HEADER_FILL
        celda.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        celda.border = CELL_BORDER

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
                celda.fill = TINT_FILL
            elif j in emphasis_cols:
                celda.fill = TINT_FILL
                celda.font = INT_FONT
            elif es_zebra:
                celda.fill = ZEBRA_FILL

            fmt = col_formats.get(j)
            if fmt:
                celda.number_format = fmt

            numerica = j in col_formats
            celda.alignment = Alignment(
                horizontal="center" if (numerica or j in emphasis_cols) else "left",
                vertical="center",
                wrap_text=(j == 1 and not es_total),
            )

    ultima = header_row + len(filas)
    _aplicar_anchos(ws, headers, filas, col_formats)
    _alturas(ws, header_row + 1, ultima)
    return ultima


def _status_rules(ws: Any, col: str, desde: int, hasta: int) -> None:
    """Color sólo de tinta (sin rellenos): BAJO/AGOTADO rojo, OK verde."""
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
    """A4 vertical auto-escalado a 1 página de ancho: nunca recorta el borde
    derecho. Márgenes generosos (0.5/0.6 pulg) — cero márgenes de fábrica."""
    ws.page_setup.orientation = ws.ORIENTATION_PORTRAIT
    ws.page_setup.paperSize = 9  # A4
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = f"{header_row}:{header_row}"
    ws.page_margins.left = ws.page_margins.right = 0.5
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


def _new_book(wb: Workbook) -> Any:
    ws = wb.active
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = SLATE_950
    return ws


# ------------------------------------------------------------------ #
#  Reportes públicos                                                  #
# ------------------------------------------------------------------ #

def inventario_xlsx(datos: list[dict], resumen: dict, generado: str) -> bytes:
    wb = Workbook()
    ws = _new_book(wb)
    ws.title = "Inventario"

    _letterhead(ws, "Reporte de Inventario", generado)
    _kpi_band(ws, [
        ("SKUs activos", resumen["skus"], INT_FMT, "referencias con stock"),
        ("Stock total", resumen["unidades"], INT_FMT, "unidades en almacén"),
        ("Valor inventario", round(resumen["valor"], 2), MONEY_BS, "a precio de lista"),
        ("Bajo mínimo", sum(1 for d in datos if d["estado"] == "BAJO"), INT_FMT, "requieren reposición"),
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
    ultima = _table(ws, headers, filas, money_cols=[9],
                    int_cols=[6, 7], emphasis_cols=[5])
    _status_rules(ws, "J", TABLE_HEADER_ROW + 1, ultima)
    ws.freeze_panes = f"A{TABLE_HEADER_ROW + 1}"
    ws.auto_filter.ref = f"A{TABLE_HEADER_ROW}:J{ultima}"
    _print_setup(ws, "Reporte de Inventario")
    _props(wb, "Reporte de Inventario")
    return _bytes(wb)


def movimientos_xlsx(datos: list[dict], resumen: dict, generado: str, periodo: str) -> bytes:
    wb = Workbook()
    ws = _new_book(wb)
    ws.title = "Movimientos"

    _letterhead(ws, f"Reporte de Movimientos · {periodo}", generado)
    _kpi_band(ws, [
        ("Entradas", resumen["entradas"], INT_FMT, "documentos de ingreso"),
        ("Salidas", resumen["salidas"], INT_FMT, "documentos de egreso"),
        ("Unidades in/out", resumen["unidades_in"] - resumen["unidades_out"], INT_FMT,
         f"{resumen['unidades_in']} in · {resumen['unidades_out']} out"),
        ("Neto del período", round(resumen["total_in"] - resumen["total_out"], 2), MONEY_BS, "valoración neta"),
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
    ws = _new_book(wb)
    ws.title = "Valoración"

    _letterhead(ws, "Valoración del Inventario por Categoría", generado)
    _kpi_band(ws, [
        ("Categorías", len(datos), INT_FMT, "activas en el catálogo"),
        ("SKUs", sum(d["skus"] for d in datos), INT_FMT, "referencias valoradas"),
        ("Unidades", sum(d["unidades"] for d in datos), INT_FMT, "stock físico"),
        ("Valor total", round(total_valor, 2), MONEY_BS, "cierre del corte"),
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
    movimientos + saldo_fin. Se añade fila TOTAL CONSOLIDADO; Intervalo y
    Saldo Fin reciben banda de énfasis; los ceros se pintan como guión tenue.
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
    entradas = sum(sum(int(d.get(k) or 0) for k in claves_num[:-1] if int(d.get(k) or 0) > 0) for d in datos)
    salidas = sum(sum(-int(d.get(k) or 0) for k in claves_num[:-1] if int(d.get(k) or 0) < 0) for d in datos)
    total_fin = sum(int(d.get("saldo_fin") or 0) for d in datos)
    total_ini = sum(int(d.get("saldo_ini") or 0) for d in datos)
    variacion = (total_fin / total_ini - 1) if total_ini else 0

    filas.append([
        "TOTAL CONSOLIDADO", "—", _modo_intervalo(datos),
    ] + [sum(int(d.get(k) or 0) for d in datos) for k in claves_num])

    wb = Workbook()
    ws = _new_book(wb)
    ws.title = "Estadísticas"

    _letterhead(ws, f"Estadísticas de Inventario · {periodo}", generado)
    _kpi_band(ws, [
        ("Entradas", entradas, INT_FMT, "unidades que ingresaron"),
        ("Salidas", salidas, INT_FMT, "unidades que salieron"),
        ("Saldo final", total_fin, INT_FMT, "unidades en stock"),
        ("Variación", variacion, PCT_FMT, "vs saldo inicial"),
    ])

    int_cols = list(range(4, 18))
    ultima = _table(ws, headers, filas, int_cols=int_cols,
                    emphasis_cols=[3, 17], total_row=True)

    ws.freeze_panes = f"D{TABLE_HEADER_ROW + 1}"
    ws.auto_filter.ref = f"A{TABLE_HEADER_ROW}:Q{ultima - 1}"

    ws.conditional_formatting.add(
        f"D{TABLE_HEADER_ROW + 1}:Q{ultima}",
        CellIsRule(operator="lessThan", formula=["0"],
                   font=Font(name=UI, size=9, bold=True, color=ALERT_RED)),
    )

    _print_setup(ws, f"Estadísticas · {periodo}")
    _props(wb, "Estadísticas de Inventario")
    return _bytes(wb)


def _modo_intervalo(datos: list[dict]) -> str:
    """Etiqueta del Intervalo para la fila total (el periodo más repetido)."""
    valores = [str(d.get("intervalo", "")) for d in datos if d.get("intervalo")]
    if not valores:
        return "—"
    return max(set(valores), key=valores.count)
