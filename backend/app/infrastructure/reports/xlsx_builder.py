"""Builder de libros XLSX ejecutivos (openpyxl): Resumen + detalle formateado."""

import math
from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.drawing.image import Image as XLImage
from openpyxl.formatting.rule import CellIsRule, DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.properties import PageSetupProperties

from app.core.config import get_settings

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
SUBTITLE_FONT = Font(bold=True, size=14, color=HANA_DARK)
META_FONT = Font(size=9, italic=True, color=HANA_MUTED)
KPI_VALUE_FONT = Font(bold=True, size=16, color=HANA_DARK)
KPI_VALUE_DANGER = Font(bold=True, size=16, color=HANA_RED)
KPI_LABEL_FONT = Font(bold=True, size=8, color=HANA_MUTED)
TOTAL_FONT = Font(bold=True, size=10, color=HANA_DARK)
TOTAL_FILL = PatternFill("solid", fgColor="F4F4F5")

MONEY_FMT = "#,##0.00"
INT_FMT = "#,##0"


def _col_px(chars: float) -> int:
    return round(chars * 7) + 5


def _mix(c1: tuple, c2: tuple, t: float) -> tuple:
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))


_STOCK_STOPS = [
    (0.00, (225, 29, 72)),
    (0.35, (251, 113, 133)),
    (0.50, (253, 164, 175)),
    (0.65, (225, 29, 72)),
    (1.00, (190, 18, 60)),
]


def _stops_color(t: float) -> tuple:
    t = max(0.0, min(1.0, t))
    for (p0, c0), (p1, c1) in zip(_STOCK_STOPS, _STOCK_STOPS[1:]):
        if t <= p1:
            f = (t - p0) / (p1 - p0) if p1 > p0 else 0.0
            return _mix(c0, c1, f)
    return _STOCK_STOPS[-1][1]


def _brand_banner_png(ancho_px: int, generado: str) -> tuple[BytesIO, int] | None:
    """Banner a lo ancho del contenido: fondo 121214, franja roja degradada,
    wordmark blanco + 'Stock' con el degradado 110° de .brand-stock, meta
    'GENERADO' a la derecha y hairline rojo con fade. None si falla Pillow."""
    try:
        from PIL import Image, ImageDraw, ImageFont

        static = get_settings().static_dir
        logo = Image.open(static / "img" / "logo-hana.png").convert("RGBA")
        ttf = str(static / "fonts" / "plus-jakarta-sans-800.ttf")
        font = ImageFont.truetype(ttf, 60)
        font_meta = ImageFont.truetype(ttf, 21)
    except Exception:
        return None

    S = 2  # supersampling 2x
    ancho = max(ancho_px, 340)
    W, H = ancho * S, 80 * S
    band = Image.new("RGBA", (W, H), (18, 18, 20, 255))
    draw = ImageDraw.Draw(band)
    for y in range(H):
        draw.line(
            [(0, y), (12 * S, y)],
            fill=_mix((225, 29, 72), (139, 16, 41), y / (H - 1)) + (255,),
        )

    logo_h = 56 * S
    logo_w = int(logo_h * logo.width / logo.height)
    band.alpha_composite(
        logo.resize((logo_w, logo_h), Image.LANCZOS), (24 * S, 12 * S)
    )

    x_txt = 24 * S + logo_w + 8 * S
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).text(
        (x_txt, 66 * S), "Stock", font=font, fill=255, anchor="ls"
    )
    bbox = mask.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        dx = math.sin(math.radians(110))
        dy = -math.cos(math.radians(110))
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        largo = abs((x1 - x0) * dx) + abs((y1 - y0) * dy)
        grad = Image.new("RGB", (x1 - x0, y1 - y0))
        px = grad.load()
        for yy in range(y1 - y0):
            for xx in range(x1 - x0):
                t = ((xx + x0 - cx) * dx + (yy + y0 - cy) * dy) / largo + 0.5
                px[xx, yy] = _stops_color(t)
        band.paste(grad, (x0, y0), mask.crop(bbox))

    draw.text(
        (W - 24 * S, H // 2),
        f"GENERADO: {generado}",
        font=font_meta,
        fill=(139, 139, 147, 255),
        anchor="rm",
    )

    fade_w = int(0.65 * W)
    hilo = Image.new("RGBA", (fade_w, 2 * S))
    hp = hilo.load()
    for x in range(fade_w):
        a = int(255 * (1 - x / fade_w))
        for yy in range(2 * S):
            hp[x, yy] = (225, 29, 72, a)
    band.alpha_composite(hilo, (0, H - 2 * S))

    buf = BytesIO()
    band.convert("RGB").save(buf, "PNG")
    buf.seek(0)
    return buf, ancho


def _brand_header(ws: Any, titulo: str, generado: str, ancho_px: int) -> None:
    ws.sheet_properties.tabColor = HANA_DARK
    for r in range(1, 4):
        ws.row_dimensions[r].height = 20  # 3 filas = 80 px
    banner = _brand_banner_png(ancho_px, generado)
    if banner is not None:
        buf, ancho = banner
        img = XLImage(buf)
        img.width, img.height = ancho, 80
        ws.add_image(img, "A1")
    else:
        ws["A2"] = "Hana"
        ws["A2"].font = Font(bold=True, size=18, color=HANA_DARK)
        ws["C2"] = "Stock"
        ws["C2"].font = Font(bold=True, size=18, color=HANA_RED)
        ws["A5"] = f"Generado: {generado}"
        ws["A5"].font = META_FONT
    ws["A4"] = titulo
    ws["A4"].font = SUBTITLE_FONT
    ws.row_dimensions[4].height = 22


def _kpi_band(ws: Any, kpis: list[tuple], start_row: int = 7) -> None:
    """Tarjetas KPI: (etiqueta, valor, formato[, danger]). Acento rojo superior;
    valor en rojo cuando danger=True y el numero es > 0. Desde la columna B."""
    for i, kpi in enumerate(kpis):
        label, value, fmt = kpi[:3]
        danger = bool(kpi[3]) if len(kpi) > 3 else False
        col = get_column_letter(2 + i)
        celda_label = ws[f"{col}{start_row}"]
        celda_valor = ws[f"{col}{start_row + 1}"]
        celda_label.value = label.upper()
        celda_label.font = KPI_LABEL_FONT
        celda_valor.value = value
        celda_valor.font = (
            KPI_VALUE_DANGER
            if danger and isinstance(value, (int, float)) and value > 0
            else KPI_VALUE_FONT
        )
        if fmt != "@" and isinstance(value, (int, float)):
            celda_valor.number_format = fmt
        celda_label.alignment = Alignment(horizontal="center", vertical="bottom")
        celda_valor.alignment = Alignment(horizontal="center", vertical="center")
        fondo = PatternFill("solid", fgColor="FFFFFF")
        celda_label.fill = fondo
        celda_valor.fill = fondo
        celda_label.border = Border(
            top=Side(style="thick", color=HANA_RED),
            left=_thin, right=_thin, bottom=_thin,
        )
        celda_valor.border = Border(left=_thin, right=_thin, bottom=_thin)
        ws.column_dimensions[col].width = 22
    ws.row_dimensions[start_row].height = 16
    ws.row_dimensions[start_row + 1].height = 30


def _table(
    ws: Any,
    headers: list[str],
    rows: list[list[Any]],
    widths: list[int],
    header_row: int,
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


def _print_setup(ws: Any, reporte: str) -> None:
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = 9  # A4
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = "1:1"
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
    ws.title = "Resumen"
    ws.sheet_view.showGridLines = False
    ancho_banner = _col_px(8.43) + 5 * _col_px(22)
    _brand_header(ws, "Reporte de Inventario — Resumen Ejecutivo", generado, ancho_banner)
    ws["A5"] = f"Umbral de stock mínimo: {resumen['minimo']} unidades por producto."
    ws["A5"].font = META_FONT
    _kpi_band(ws, [
        ("SKUs activos", resumen["skus"], INT_FMT),
        ("Unidades en stock", resumen["unidades"], INT_FMT),
        ("Valor inventario (Bs)", resumen["valor"], MONEY_FMT),
        ("Alertas stock bajo", resumen["alertas"], INT_FMT, True),
        ("Unidades por reponer", resumen["faltante"], INT_FMT, True),
    ])

    ws2 = wb.create_sheet("Inventario")
    ws2.sheet_properties.tabColor = HANA_RED
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
    ultima = _table(ws2, headers, filas, [16, 30, 14, 16, 11, 11, 13, 12, 14, 12], header_row=1, money_cols=[7, 9], int_cols=[6])
    _status_rules(ws2, "J", 2, ultima)
    ws2.freeze_panes = "A2"
    ws2.auto_filter.ref = f"A1:J{ultima}"
    _print_setup(ws2, "Reporte de Inventario")
    _props(wb, "Reporte de Inventario")
    return _bytes(wb)


def movimientos_xlsx(datos: list[dict], resumen: dict, generado: str, periodo: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Resumen"
    ws.sheet_view.showGridLines = False
    ancho_banner = _col_px(8.43) + 6 * _col_px(22)
    _brand_header(ws, "Reporte de Movimientos — Resumen Ejecutivo", generado, ancho_banner)
    ws["A5"] = periodo
    ws["A5"].font = META_FONT
    _kpi_band(ws, [
        ("Entradas", resumen["entradas"], INT_FMT),
        ("Unidades entradas", resumen["unidades_in"], INT_FMT),
        ("Valor entradas (Bs)", resumen["total_in"], MONEY_FMT),
        ("Salidas", resumen["salidas"], INT_FMT),
        ("Unidades salidas", resumen["unidades_out"], INT_FMT),
        ("Valor salidas (Bs)", resumen["total_out"], MONEY_FMT),
    ])

    ws2 = wb.create_sheet("Movimientos")
    ws2.sheet_properties.tabColor = HANA_RED
    headers = ["Fecha", "Tipo", "Código", "Contraparte", "Producto", "Artículos", "Total (Bs)", "Estado"]
    filas = [
        [
            d["fecha"], d["tipo"], d["codigo"], d["contraparte"], d["producto"],
            d["articulos"], d["total"], d["estado"],
        ]
        for d in datos
    ]
    ultima = _table(ws2, headers, filas, [17, 11, 14, 22, 36, 12, 13, 13], header_row=1, money_cols=[7], int_cols=[6])
    _movimientos_rules(ws2, "B", 2, ultima)
    ws2.freeze_panes = "A2"
    ws2.auto_filter.ref = f"A1:H{ultima}"
    _print_setup(ws2, "Reporte de Movimientos")
    _props(wb, "Reporte de Movimientos")
    return _bytes(wb)


def valoracion_xlsx(datos: list[dict], total_valor: float, generado: str) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = "Valoración"
    ws.sheet_view.showGridLines = False
    ancho_banner = sum(_col_px(w) for w in [26, 11, 13, 16, 17])
    _brand_header(ws, "Valoración del Inventario por Categoría", generado, ancho_banner)

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
    ultima = _table(ws, headers, filas, [26, 11, 13, 16, 17], header_row=7, money_cols=[4], int_cols=[2, 3])
    for r in range(8, ultima + 1):
        ws.cell(row=r, column=5).number_format = "0.0%"

    r_total = ultima
    for j in range(1, 6):
        celda = ws.cell(row=r_total, column=j)
        celda.font = TOTAL_FONT
        celda.fill = TOTAL_FILL
        celda.border = Border(
            left=_thin, right=_thin, bottom=_thin,
            top=Side(style="medium", color=HANA_DARK),
        )

    if datos:
        ws.conditional_formatting.add(
            f"E8:E{ultima - 1}",
            DataBarRule(
                start_type="num", start_value=0,
                end_type="num", end_value=1,
                color="F43F5E", showValue=True,
            ),
        )
        chart = BarChart()
        chart.type = "bar"
        chart.style = 10
        chart.title = "Valor del inventario por categoría (Bs)"
        chart.height = 9
        chart.width = 18
        chart.legend = None
        data = Reference(ws, min_col=4, min_row=8, max_row=ultima - 1)
        cats = Reference(ws, min_col=1, min_row=8, max_row=ultima - 1)
        chart.add_data(data, titles_from_data=False)
        chart.set_categories(cats)
        if chart.series:
            chart.series[0].graphicalProperties.solidFill = HANA_RED
        ws.add_chart(chart, f"G{8}")
    _props(wb, "Valoración por Categoría")
    return _bytes(wb)
