"""Builder de documentos PDF ejecutivos (reportlab) con identidad Hana."""

import math
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    LongTable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import HorizontalBarChart

from app.core.config import get_settings

HANA_RED = colors.HexColor("#E11D48")
HANA_DARK = colors.HexColor("#121214")
HANA_MUTED = colors.HexColor("#8B8B93")
ROW_ALT = colors.HexColor("#F7F7F8")
BORDER = colors.HexColor("#E4E4E7")
ALERT_BG = colors.HexColor("#FEE2E2")
ALERT_FG = colors.HexColor("#B91C1C")
OK_BG = colors.HexColor("#ECFDF5")
OK_FG = colors.HexColor("#059669")

PAGE_W, PAGE_H = landscape(A4)

TITLE_STYLE = ParagraphStyle(
    "ReportTitle", fontName="Helvetica-Bold", fontSize=15, leading=18,
    textColor=HANA_DARK, spaceAfter=6,
)
META_STYLE = ParagraphStyle(
    "ReportMeta", fontName="Helvetica", fontSize=8, textColor=HANA_MUTED, spaceAfter=10
)
SECTION_STYLE = ParagraphStyle(
    "Section", fontName="Helvetica-Bold", fontSize=10, textColor=HANA_RED,
    spaceBefore=12, spaceAfter=6,
)
CELL_STYLE = ParagraphStyle("Cell", fontName="Helvetica", fontSize=7.5, leading=9)
CELL_RIGHT = ParagraphStyle("CellRight", parent=CELL_STYLE, alignment=2)
CELL_BOLD = ParagraphStyle("CellBold", parent=CELL_STYLE, fontName="Helvetica-Bold")
CELL_BOLD_RIGHT = ParagraphStyle("CellBoldRight", parent=CELL_RIGHT, fontName="Helvetica-Bold")
CELL_NEG = ParagraphStyle("CellNeg", parent=CELL_RIGHT, textColor=ALERT_FG)
CELL_HDR = ParagraphStyle(
    "CellHdr", fontName="Helvetica-Bold", fontSize=6, leading=7.5,
    textColor=colors.white, alignment=1,
)
KPI_VALUE_STYLE = ParagraphStyle(
    "KpiValue", fontName="Helvetica-Bold", fontSize=14, textColor=HANA_DARK,
    alignment=1, leading=16,
)
KPI_LABEL_STYLE = ParagraphStyle(
    "KpiLabel", fontName="Helvetica", fontSize=7, textColor=HANA_MUTED, alignment=1
)
ESTILO_ALERTA = ParagraphStyle(
    "AlertCell", parent=CELL_STYLE, fontName="Helvetica-Bold", textColor=ALERT_FG
)
ESTILO_OK = ParagraphStyle("OkCell", parent=CELL_STYLE, textColor=OK_FG)


def _money(v: float) -> str:
    return f"{v:,.2f}"


BANDA_H = 24 * mm
BANDA_L = colors.HexColor("#0B0B0D")
BANDA_R = colors.HexColor("#1A1A1F")
HANA_ROJO_OSCURO = colors.HexColor("#8B1029")
WORDMARK_H = 7 * mm
WORDMARK_W = WORDMARK_H * 901 / 281

# Réplica exacta de .brand-stock/.brand-word del sistema (custom.css:2075-2091)
STOCK_TEXTO = "Stock"
STOCK_SIZE = 10.5
STOCK_TRACK = -0.025 * STOCK_SIZE
STOCK_GRAD = [
    (0.00, colors.HexColor("#E11D48")),
    (0.35, colors.HexColor("#FB7185")),
    (0.50, colors.HexColor("#FDA4AF")),
    (0.65, colors.HexColor("#E11D48")),
    (1.00, colors.HexColor("#BE123C")),
]
STOCK_FONT = "Helvetica-Bold"

try:
    pdfmetrics.registerFont(
        TTFont(
            "PJS-ExtraBold",
            str(get_settings().static_dir / "fonts" / "plus-jakarta-sans-800.ttf"),
        )
    )
    STOCK_FONT = "PJS-ExtraBold"
except Exception:
    pass


def _wordmark_path() -> str:
    return str(get_settings().static_dir / "img" / "logo-hana.png")


def _lerp(c1: colors.Color, c2: colors.Color, t: float) -> colors.Color:
    return colors.Color(
        c1.red + (c2.red - c1.red) * t,
        c1.green + (c2.green - c1.green) * t,
        c1.blue + (c2.blue - c1.blue) * t,
    )


def _h_gradient(canvas: Any, x: float, y: float, w: float, h: float,
                c1: colors.Color, c2: colors.Color, pasos: int = 40) -> None:
    for i in range(pasos):
        canvas.setFillColor(_lerp(c1, c2, (i + 0.5) / pasos))
        canvas.rect(x + w * i / pasos, y, w / pasos + 0.5, h, stroke=0, fill=1)


def _v_gradient(canvas: Any, x: float, y: float, w: float, h: float,
                c_top: colors.Color, c_bot: colors.Color, pasos: int = 12) -> None:
    for i in range(pasos):
        canvas.setFillColor(_lerp(c_top, c_bot, (i + 0.5) / pasos))
        canvas.rect(x, y + h * (pasos - 1 - i) / pasos, w, h / pasos + 0.5,
                    stroke=0, fill=1)


def _draw_right_tracked(canvas: Any, text: str, x_right: float, y: float,
                        font: str, size: float, tracking: float,
                        color: colors.Color) -> float:
    """Derecha-alineado con letter-spacing; devuelve el ancho ocupado."""
    w = canvas.stringWidth(text, font, size) + tracking * max(0, len(text) - 1)
    tx = canvas.beginText(x_right - w, y)
    tx.setFont(font, size)
    tx.setFillColor(color)
    tx.setCharSpace(tracking)
    tx.textOut(text)
    canvas.drawText(tx)
    return w


def _stock_text(canvas: Any, x: float, y_baseline: float) -> None:
    """"Stock" con el gradiente 110° del sistema, vectorial (recorte de glifos)."""
    dx = math.sin(math.radians(110))
    dy = -math.cos(math.radians(110))
    w = (
        canvas.stringWidth(STOCK_TEXTO, STOCK_FONT, STOCK_SIZE)
        + STOCK_TRACK * (len(STOCK_TEXTO) - 1)
    )
    cx, cy = x + w / 2, y_baseline + STOCK_SIZE / 2
    largo = abs(w * dx) + abs(STOCK_SIZE * dy)
    canvas.saveState()
    tx = canvas.beginText(x, y_baseline)
    tx.setFont(STOCK_FONT, STOCK_SIZE)
    tx.setCharSpace(STOCK_TRACK)
    tx.setTextRenderMode(7)
    tx.textOut(STOCK_TEXTO)
    canvas.drawText(tx)
    canvas.linearGradient(
        cx - dx * largo / 2, cy - dy * largo / 2,
        cx + dx * largo / 2, cy + dy * largo / 2,
        [c for _, c in STOCK_GRAD],
        [p for p, _ in STOCK_GRAD],
    )
    canvas.restoreState()


def _on_page(canvas: Any, _doc: Any, _titulo: str, generado: str,
             mostrar_pagina: bool = True) -> None:
    canvas.saveState()
    top = PAGE_H
    y_banda = top - BANDA_H

    _h_gradient(canvas, 0, y_banda, PAGE_W, BANDA_H, BANDA_L, BANDA_R)
    _v_gradient(canvas, 0, y_banda, 3 * mm, BANDA_H, HANA_RED, HANA_ROJO_OSCURO)

    y_img = top - 12 * mm - WORDMARK_H / 2
    canvas.drawImage(
        _wordmark_path(), 10 * mm, y_img,
        width=WORDMARK_W, height=WORDMARK_H, mask="auto",
    )
    _stock_text(canvas, 10 * mm + WORDMARK_W + 1.2 * mm, y_img + 0.1 * mm)

    _draw_right_tracked(canvas, f"GENERADO: {generado}", PAGE_W - 12 * mm,
                        top - 12 * mm, "Helvetica", 6.5, 0.8, HANA_MUTED)

    w_fade, alto_hilo = 0.65 * PAGE_W, 0.7 * mm
    for i in range(30):
        t = i / 29
        canvas.setFillColor(
            colors.Color(HANA_RED.red, HANA_RED.green, HANA_RED.blue, alpha=1 - t)
        )
        canvas.rect(w_fade * i / 30, y_banda - alto_hilo, w_fade / 30 + 0.5,
                    alto_hilo, stroke=0, fill=1)

    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(10 * mm, 12 * mm, PAGE_W - 10 * mm, 12 * mm)
    if mostrar_pagina:
        w_pg = _draw_right_tracked(canvas, f"Página {canvas.getPageNumber()}",
                                   PAGE_W - 10 * mm, 7 * mm, "Helvetica", 7, 0.8,
                                   HANA_MUTED)
        canvas.setFillColor(HANA_RED)
        canvas.rect(PAGE_W - 10 * mm - w_pg - 3 * mm, 6.6 * mm, 1.5 * mm, 1.5 * mm,
                    stroke=0, fill=1)
    canvas.restoreState()


def _build(titulo: str, generado: str, flowables: list, mostrar_pagina: bool = True,
           top_margin: float = 32 * mm, bottom_margin: float = 18 * mm) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        title=titulo,
        author="HanaStock",
    )
    doc.build(
        flowables,
        onFirstPage=lambda c, d: _on_page(c, d, titulo, generado, mostrar_pagina),
        onLaterPages=lambda c, d: _on_page(c, d, titulo, generado, mostrar_pagina),
    )
    return buf.getvalue()


def _kpi_table(kpis: list[tuple[str, str]], ancho: float,
               h1: float = 9 * mm, h2: float = 6 * mm,
               v_style: ParagraphStyle = KPI_VALUE_STYLE,
               l_style: ParagraphStyle = KPI_LABEL_STYLE) -> Table:
    celdas = [
        [Paragraph(valor, v_style) for _, valor in kpis],
        [Paragraph(labela.upper(), l_style) for labela, _ in kpis],
    ]
    col_w = ancho / len(kpis)
    tabla = Table(celdas, colWidths=[col_w] * len(kpis), rowHeights=[h1, h2])
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ROW_ALT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.white),
        ("VALIGN", (0, 0), (-1, 0), "BOTTOM"),
        ("VALIGN", (0, 1), (-1, 1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 4),
    ]))
    return tabla


def _data_table(headers: list[str], rows: list, widths: list, align_right: list[int],
                fs: float = 7.5, pad: float = 3) -> Table:
    wrapped = []
    for row in rows:
        wrapped.append(
            [
                cell if isinstance(cell, Paragraph)
                else Paragraph(str(cell), CELL_RIGHT if j in align_right else CELL_STYLE)
                for j, cell in enumerate(row)
            ]
        )
    tabla = LongTable([headers] + wrapped, colWidths=widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), HANA_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), fs),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
    ]
    for col in align_right:
        style.append(("ALIGN", (col, 1), (col, -1), "RIGHT"))
    tabla.setStyle(TableStyle(style))
    return tabla


def inventario_pdf(datos: list[dict], resumen: dict, generado: str) -> bytes:
    ancho = PAGE_W - 24 * mm
    flow: list = [
        Paragraph("Reporte de Inventario — Resumen Ejecutivo", TITLE_STYLE),
        Paragraph(
            f"Umbral de stock mínimo: {resumen['minimo']} unidades por producto.",
            META_STYLE,
        ),
        _kpi_table(
            [
                ("SKUs activos", f"{resumen['skus']}"),
                ("Unidades en stock", f"{resumen['unidades']:,}"),
                ("Valor inventario (Bs)", _money(resumen["valor"])),
                ("Alertas stock bajo", f"{resumen['alertas']}"),
                ("Unidades por reponer", f"{resumen['faltante']:,}"),
            ],
            ancho,
        ),
        Spacer(1, 4 * mm),
    ]

    filas = [
        [
            d["codigo"],
            Paragraph(d["nombre"], CELL_STYLE),
            d["marca"], d["categoria"], d["pasillo"],
            str(d["stock"]), _money(d["precio"]), d["moneda"], _money(d["valor"]),
            Paragraph(d["estado"], ESTILO_ALERTA if d["estado"] == "BAJO" else ESTILO_OK),
        ]
        for d in datos
    ]
    anchos = [
        ancho * w for w in
        [0.11, 0.22, 0.10, 0.12, 0.06, 0.06, 0.09, 0.07, 0.10, 0.07]
    ]
    tabla = _data_table(
        ["Código", "Nombre", "Marca", "Categoría", "Pasillo", "Stock", "Precio", "Moneda", "Valor (Bs)", "Estado"],
        filas, anchos, align_right=[5, 6, 8],
    )
    extra = [
        ("BACKGROUND", (9, i), (9, i), ALERT_BG if d["estado"] == "BAJO" else OK_BG)
        for i, d in enumerate(datos, start=1)
    ]
    tabla.setStyle(TableStyle(extra))
    flow.append(Paragraph("DETALLE DE INVENTARIO", SECTION_STYLE))
    flow.append(tabla)

    alertas = [d for d in datos if d["estado"] == "BAJO"]
    flow.append(Paragraph("ALERTAS DE STOCK BAJO", SECTION_STYLE))
    if alertas:
        filas_a = [
            [d["codigo"], d["nombre"], str(d["stock"]), str(resumen["minimo"]),
             Paragraph(str(d["faltante"]), ESTILO_ALERTA), d["categoria"]]
            for d in alertas
        ]
        tabla_a = _data_table(
            ["Código", "Nombre", "Stock actual", "Mínimo", "Unidades faltantes", "Categoría"],
            filas_a,
            [ancho * w for w in [0.14, 0.30, 0.12, 0.10, 0.16, 0.18]],
            align_right=[2, 3, 4],
        )
        tabla_a.setStyle(TableStyle([
            ("BACKGROUND", (0, 1), (-1, -1), ALERT_BG),
        ]))
        flow.append(tabla_a)
        total_f = Paragraph(
            f"<b>Total unidades por reponer: {resumen['faltante']:,} · "
            f"Costo estimado de reposición: Bs {_money(resumen['costo_reposicion'])}</b>",
            CELL_BOLD,
        )
        flow.append(Spacer(1, 2 * mm))
        flow.append(total_f)
    else:
        flow.append(Paragraph("Sin alertas: todo el inventario supera el mínimo.", CELL_STYLE))

    return _build("Reporte de Inventario", generado, flow)


def movimientos_pdf(datos: list[dict], resumen: dict, generado: str, periodo: str) -> bytes:
    ancho = PAGE_W - 24 * mm
    flow: list = [
        Paragraph("Reporte de Movimientos — Entradas y Salidas", TITLE_STYLE),
        Paragraph(periodo, META_STYLE),
        _kpi_table(
            [
                ("Entradas", f"{resumen['entradas']}"),
                ("Unidades entradas", f"{resumen['unidades_in']:,}"),
                ("Valor entradas (Bs)", _money(resumen['total_in'])),
                ("Salidas", f"{resumen['salidas']}"),
                ("Unidades salidas", f"{resumen['unidades_out']:,}"),
                ("Valor salidas (Bs)", _money(resumen['total_out'])),
            ],
            ancho,
        ),
        Spacer(1, 4 * mm),
        Paragraph("HISTORIAL DE MOVIMIENTOS", SECTION_STYLE),
    ]

    filas = [
        [
            d["fecha"],
            Paragraph(
                d["tipo"],
                ESTILO_OK if d["tipo"] == "ENTRADA" else ESTILO_ALERTA,
            ),
            d["codigo"],
            Paragraph(d["contraparte"], CELL_STYLE),
            Paragraph(d["producto"], CELL_STYLE),
            str(d["articulos"]), _money(d["total"]), d["estado"],
        ]
        for d in datos
    ]
    tabla = _data_table(
        ["Fecha", "Tipo", "Código", "Contraparte", "Producto", "Artículos", "Total (Bs)", "Estado"],
        filas,
        [ancho * w for w in [0.10, 0.07, 0.10, 0.16, 0.27, 0.07, 0.10, 0.13]],
        align_right=[5, 6],
    )
    extra = [
        (
            "BACKGROUND", (1, i), (1, i),
            OK_BG if d["tipo"] == "ENTRADA" else ALERT_BG,
        )
        for i, d in enumerate(datos, start=1)
    ]
    tabla.setStyle(TableStyle(extra))
    flow.append(tabla)
    return _build("Reporte de Movimientos", generado, flow)


def valoracion_pdf(datos: list[dict], total_valor: float, generado: str) -> bytes:
    ancho = PAGE_W - 24 * mm
    flow: list = [
        Paragraph("Valoración del Inventario por Categoría", TITLE_STYLE),
        Paragraph("Distribución del valor inmovilizado y peso relativo por línea de negocio.", META_STYLE),
        _kpi_table(
            [
                ("Categorías activas", f"{len(datos)}"),
                ("SKUs totales", f"{sum(d['skus'] for d in datos):,}"),
                ("Unidades totales", f"{sum(d['unidades'] for d in datos):,}"),
                ("Valor total (Bs)", _money(total_valor)),
            ],
            ancho,
        ),
        Spacer(1, 4 * mm),
    ]

    filas = [
        [d["categoria"], str(d["skus"]), f"{d['unidades']:,}", _money(d["valor"]), f"{d['pct']}%"]
        for d in datos
    ]
    filas.append([
        Paragraph("TOTALES", CELL_BOLD),
        Paragraph(str(sum(d["skus"] for d in datos)), CELL_BOLD),
        Paragraph(f"{sum(d['unidades'] for d in datos):,}", CELL_BOLD),
        Paragraph(_money(total_valor), CELL_RIGHT),
        Paragraph("100%", CELL_BOLD),
    ])
    tabla = _data_table(
        ["Categoría", "SKUs", "Unidades", "Valor (Bs)", "% del inventario"],
        filas,
        [ancho * w for w in [0.30, 0.12, 0.16, 0.22, 0.20]],
        align_right=[1, 2, 3, 4],
    )
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, len(filas)), (-1, len(filas)), ROW_ALT),
    ]))
    flow.append(Paragraph("DETALLE POR CATEGORÍA", SECTION_STYLE))
    flow.append(tabla)

    if datos:
        flow.append(Paragraph("DISTRIBUCIÓN DEL VALOR", SECTION_STYLE))
        d = Drawing(int(ancho), 160)
        bar = HorizontalBarChart()
        bar.x, bar.y, bar.width, bar.height = 250, 10, int(ancho) - 270, 140
        bar.data = [[dato["valor"] for dato in reversed(datos)]]
        bar.categoryAxis.categoryNames = [dato["categoria"] for dato in reversed(datos)]
        bar.categoryAxis.labels.fontName = "Helvetica"
        bar.categoryAxis.labels.fontSize = 7
        bar.valueAxis.labels.fontName = "Helvetica"
        bar.valueAxis.labels.fontSize = 7
        bar.valueAxis.valueMin = 0
        bar.bars[0].fillColor = HANA_RED
        bar.bars[0].strokeColor = None
        bar.categoryAxis.strokeColor = BORDER
        bar.valueAxis.strokeColor = BORDER
        bar.valueAxis.gridStrokeColor = BORDER
        d.add(bar)
        flow.append(d)

    return _build("Valoración por Categoría", generado, flow)


def estadisticas_pdf(datos: list[dict], periodo: str, intervalo: str, generado: str) -> bytes:
    """Control de Saldos rd026: KPIs + auditoría de 17 columnas con totales.

    Auto-ajuste a 1 hoja: mide el bloque superior real (título+meta+KPI),
    calcula el pitch de fila que cabe en el resto del marco y escala
    tipografía/leading/padding con backoff medido. Con >24 líneas (p. ej.
    60 filas de las 64 agencias) activa el modo compacto: banda KPI enana y
    márgenes 28/13 mm — todo en 1 sola hoja horizontal A4 sin recortar.
    """
    ancho = PAGE_W - 24 * mm - 12  # 12 pt: padding horizontal del Frame (6+6)
    in_cols = ["compra", "devcom", "recepcion", "transferencia", "traslado",
               "ajuste", "inv_fisico", "produccion", "devol"]
    out_cols = ["venta", "nota_entrega", "nota_devcom"]
    num_cols = ["ini", *in_cols, *out_cols, "fin"]
    tot = {k: sum(d[k] for d in datos) for k in num_cols}

    n = max(len(datos), 1)
    compacto = n > 24
    top_m = 28 * mm if compacto else 32 * mm
    bot_m = 13 * mm if compacto else 18 * mm
    disponible = PAGE_H - top_m - bot_m - 12  # 12 pt: padding vertical del Frame

    deps = sorted({d["dep"] for d in datos})
    dep_txt = " · ".join(deps[:6]) + (f" · +{len(deps) - 6} más" if len(deps) > 6 else "")

    title_style = (ParagraphStyle("sTitle", parent=TITLE_STYLE, fontSize=10.5, leading=12.5, spaceAfter=3)
                   if compacto else TITLE_STYLE)
    meta_style = (ParagraphStyle("sMeta", parent=META_STYLE, fontSize=6.5, spaceAfter=5)
                  if compacto else META_STYLE)
    kpi_v = (ParagraphStyle("sKpiV", parent=KPI_VALUE_STYLE, fontSize=10, leading=11.5)
             if compacto else KPI_VALUE_STYLE)
    kpi_l = (ParagraphStyle("sKpiL", parent=KPI_LABEL_STYLE, fontSize=5.8)
             if compacto else KPI_LABEL_STYLE)

    head: list = [
        Paragraph("Estadísticas de Inventario", title_style),
        Paragraph(
            f"Auditoría contable de 17 columnas · Período: {periodo} ({intervalo}) · "
            f"{len(datos)} líneas · Depósitos: {dep_txt}",
            meta_style,
        ),
        _kpi_table(
            [
                ("Líneas auditadas", f"{len(datos)}"),
                ("Saldo inicial", f"{tot['ini']:,}"),
                ("Entradas", f"{sum(tot[k] for k in in_cols):,}"),
                ("Salidas", f"{sum(tot[k] for k in out_cols):,}"),
                ("Saldo final", f"{tot['fin']:,}"),
            ],
            ancho,
            h1=7 * mm if compacto else 9 * mm,
            h2=4.5 * mm if compacto else 6 * mm,
            v_style=kpi_v,
            l_style=kpi_l,
        ),
        Spacer(1, 2 * mm if compacto else 4 * mm),
    ]
    head_h = sum(f.wrap(ancho, disponible)[1]
                 + f.getSpaceBefore() + f.getSpaceAfter() for f in head)

    w_pt = [186, 36, 61, 40, 32, 32, 42, 51, 40, 28, 32, 27, 28, 33, 43, 33, 31]
    anchos = [ancho * (w / sum(w_pt)) for w in w_pt]
    headers_txt = [
        "Descripción", "Depósito", "Intervalo", "Saldo Ini", "Compra", "Devcom",
        "Recepción", "Transferencia", "Traslado", "Ajuste", "Inv. Físico",
        "Venta", "Devol", "Nota Entrega", "Producción", "Nota Devcom", "Saldo Fin",
    ]

    def _make(fs: float, lead: float, pad: float) -> Table:
        cell = ParagraphStyle("sCell", fontName="Helvetica", fontSize=fs, leading=lead)
        cell_r = ParagraphStyle("sCellR", parent=cell, alignment=2)
        cell_neg = ParagraphStyle("sCellNeg", parent=cell_r, textColor=ALERT_FG)
        hdr = ParagraphStyle("sHdr", fontName="Helvetica-Bold", fontSize=max(3.6, fs * 0.88),
                             leading=fs * 1.05, textColor=colors.white, alignment=1)

        def _num(v: int) -> Paragraph:
            return Paragraph(str(v), cell_neg if v < 0 else cell_r)

        filas = [
            [
                Paragraph(d["desc"], cell),
                Paragraph(d["dep"], cell_r),
                Paragraph(d["intervalo"], cell),
                *[_num(d[k]) for k in num_cols],
            ]
            for d in datos
        ]
        tabla = _data_table([Paragraph(h, hdr) for h in headers_txt], filas, anchos,
                            align_right=list(range(3, 17)), fs=fs, pad=pad)
        tabla.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 3 if compacto else 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 if compacto else 4),
        ]))
        return tabla

    presupuesto = disponible - head_h - 4
    fs = 7.5
    lead = min(9, fs * 1.18)
    pad = min(3, max(0.2, (presupuesto / (n + 1) - lead) / 2))
    tabla = _make(fs, lead, pad)
    for _ in range(8):
        th = tabla.wrap(ancho, disponible)[1]
        if th <= presupuesto:
            break
        exceso = th - presupuesto
        pad_nuevo = min(3, max(0.0, pad - exceso / (2 * n)))
        if pad_nuevo < 0.2 or pad_nuevo >= pad:
            fs = max(3.8, fs * (presupuesto / th) ** 0.6)
            lead = min(9, fs * 1.18)
            pad_nuevo = min(3, max(0.2, (presupuesto / (n + 1) - lead) / 2))
        pad = pad_nuevo
        tabla = _make(fs, lead, pad)
    head.append(tabla)

    return _build("Estadísticas de Inventario", generado, head, mostrar_pagina=False,
                  top_margin=top_m, bottom_margin=bot_m)
