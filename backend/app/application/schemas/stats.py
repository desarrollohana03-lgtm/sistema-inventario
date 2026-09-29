"""DTOs para estadísticas y KPIs del sistema en tiempo real."""

from pydantic import BaseModel, Field


class CategoriaDistribucion(BaseModel):
    nombre: str
    unidades: int
    pct: int


class StatsOut(BaseModel):
    total_stock: int
    unidades_bajo_minimo: int
    stock_minimo: int
    total_productos: int
    agencias_activas: int
    agencias_total: int
    distribucion: list[CategoriaDistribucion]
    distribucion_ticks: list[int]


class StatsPdfFila(BaseModel):
    desc: str = Field(max_length=200)
    dep: str = Field(max_length=20)
    intervalo: str = Field(max_length=40)
    ini: int
    compra: int
    devcom: int
    recepcion: int
    transferencia: int
    traslado: int
    ajuste: int
    inv_fisico: int
    venta: int
    devol: int
    nota_entrega: int
    produccion: int
    nota_devcom: int
    fin: int


class StatsPdfIn(BaseModel):
    periodo: str = Field(max_length=80)
    intervalo: str = Field(max_length=40)
    filas: list[StatsPdfFila] = Field(min_length=1, max_length=500)
