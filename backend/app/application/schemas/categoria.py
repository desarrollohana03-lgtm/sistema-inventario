"""DTOs de Categoría (entrada y salida de la capa de aplicación)."""

from pydantic import BaseModel, ConfigDict, Field


class CategoriaCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    descripcion: str | None = None


class CategoriaOut(CategoriaCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int