"""DTOs para estadísticas y KPIs del sistema en tiempo real."""

from pydantic import BaseModel


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
