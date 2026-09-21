"""DTOs de Producto (entrada y salida de la capa de aplicación)."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.application.schemas.categoria import CategoriaOut
from app.domain.enums import Moneda


class ProductoCreate(BaseModel):
    codigo: str = Field(min_length=1, max_length=40)
    nombre: str = Field(min_length=1, max_length=120)
    marca: str | None = Field(default=None, max_length=80)
    talla: str | None = Field(default=None, max_length=20)
    color: str | None = Field(default=None, max_length=60)
    precio: Decimal = Field(default=Decimal("0.00"), ge=0)
    moneda: Moneda = Moneda.BS
    stock: int = Field(default=0, ge=0)
    pasillo: str | None = Field(default=None, max_length=20)
    categoria_id: int | None = None


class ProductoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    marca: str | None = Field(default=None, max_length=80)
    talla: str | None = Field(default=None, max_length=20)
    color: str | None = Field(default=None, max_length=60)
    precio: Decimal | None = Field(default=None, ge=0)
    moneda: Moneda | None = None
    stock: int | None = Field(default=None, ge=0)
    pasillo: str | None = Field(default=None, max_length=20)
    categoria_id: int | None = None


class ProductoStockAdjust(BaseModel):
    stock: int | None = Field(default=None, ge=0)
    delta: int | None = None


class ProductoOut(ProductoCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    categoria: CategoriaOut | None = None