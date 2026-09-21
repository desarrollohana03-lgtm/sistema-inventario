"""Entidad Ingreso (modelo SQLAlchemy).

Alta de stock en el almacén central (entradas de proveedor). Su `fecha`
alimenta las métricas temporales del panel (movimientos del mes).
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class Ingreso(Base):
    __tablename__ = "ingresos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    proveedor: Mapped[str] = mapped_column(String(80))
    producto_id: Mapped[int | None] = mapped_column(
        ForeignKey("productos.id", ondelete="SET NULL"), nullable=True, index=True
    )
    articulos: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)

    def __repr__(self) -> str:
        return f"Ingreso(id={self.id}, codigo={self.codigo!r}, fecha={self.fecha!r})"
