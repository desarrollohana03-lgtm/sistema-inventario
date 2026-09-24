"""Builder de documentos PDF ejecutivos (reportlab) con identidad Hana."""

from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
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
    "ReportTitle", fontName="Helvetica-Bold", fontSize=15, textColor=HANA_DARK, spaceAfter=2
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


def _on_page(canvas: Any, _doc: Any, titulo: str, generado: str) -> None:
    canvas.saveState()
    canvas.setFillColor(HANA_DARK)
    canvas.rect(0, PAGE_H - 22 * mm, PAGE_W, 22 * mm, stroke=0, fill=1)
    canvas.setFillColor(HANA_RED)
    canvas.rect(0, PAGE_H - 22 * mm, 4 * mm, 22 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawString(10 * mm, PAGE_H - 11 * mm, "MUNDO HANA")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(HANA_MUTED)
    canvas.drawString(10 * mm, PAGE_H - 16.5 * mm, "HanaFlow · Sistema de Inventario")
    canvas.drawRightString(PAGE_W - 12 * mm, PAGE_H - 11 * mm, titulo)
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(PAGE_W - 12 * mm, PAGE_H - 16.5 * mm, f"Generado: {generado}")

    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(10 * mm, 12 * mm, PAGE_W - 10 * mm, 12 * mm)
    canvas.setFillColor(HANA_MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(10 * mm, 7 * mm, "Documento generado automáticamente · Uso interno")
    canvas.drawRightString(PAGE_W - 10 * mm, 7 * mm, f"Página {canvas.getPageNumber()}")
    canvas.restoreState()


def _build(titulo: str, generado: str, flowables: list) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=30 * mm,
        bottomMargin=18 * mm,
        title=titulo,
        author="HanaFlow",
    )
    doc.build(
        flowables,
        onFirstPage=lambda c, d: _on_page(c, d, titulo, generado),
        onLaterPages=lambda c, d: _on_page(c, d, titulo, generado),
    )
    return buf.getvalue()


def _kpi_table(kpis: list[tuple[str, str]], ancho: float) -> Table:
    celdas = [
        [Paragraph(valor, KPI_VALUE_STYLE) for _, valor in kpis],
        [Paragraph(labela.upper(), KPI_LABEL_STYLE) for labela, _ in kpis],
    ]
    col_w = ancho / len(kpis)
    tabla = Table(celdas, colWidths=[col_w] * len(kpis), rowHeights=[9 * mm, 6 * mm])
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


def _data_table(headers: list[str], rows: list, widths: list, align_right: list[int]) -> Table:
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
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
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
