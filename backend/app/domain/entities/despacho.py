"""Entidad Despacho (modelo SQLAlchemy).

Representa un despacho/transferencia finalizada entre nodos (central ↔ agencias).
Su `fecha` alimenta las métricas temporales del panel (variación semanal).
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum as SAEnum, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.enums import EstadoDespacho
from app.infrastructure.database.base import Base


class Despacho(Base):
    __tablename__ = "despachos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    origen: Mapped[str] = mapped_column(String(40))
    destino: Mapped[str] = mapped_column(String(40), index=True)
    articulos: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    estado: Mapped[EstadoDespacho] = mapped_column(
        SAEnum(EstadoDespacho, name="estado_despacho"),
        default=EstadoDespacho.COMPLETADA,
        nullable=False,
        index=True,
    )
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)

    def __repr__(self) -> str:
        return f"Despacho(id={self.id}, codigo={self.codigo!r}, fecha={self.fecha!r})"
