"""Entidad Categoría (modelo SQLAlchemy)."""

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.domain.entities.producto import Producto


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)

    productos: Mapped[list["Producto"]] = relationship(
        back_populates="categoria", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"Categoria(id={self.id}, nombre={self.nombre!r})"