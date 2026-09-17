"""Entidad Producto (modelo SQLAlchemy)."""

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import Moneda
from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.domain.entities.categoria import Categoria


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120), index=True)
    marca: Mapped[str | None] = mapped_column(String(80), nullable=True)
    talla: Mapped[str | None] = mapped_column(String(20), nullable=True)
    color: Mapped[str | None] = mapped_column(String(60), nullable=True)
    precio: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    moneda: Mapped[Moneda] = mapped_column(
        SAEnum(Moneda, name="moneda"), default=Moneda.BS, nullable=False
    )
    stock: Mapped[int] = mapped_column(default=0, nullable=False)
    categoria_id: Mapped[int | None] = mapped_column(
        ForeignKey("categorias.id", ondelete="SET NULL"), nullable=True, index=True
    )

    categoria: Mapped["Categoria | None"] = relationship(
        back_populates="productos", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"Producto(id={self.id}, codigo={self.codigo!r}, nombre={self.nombre!r})"