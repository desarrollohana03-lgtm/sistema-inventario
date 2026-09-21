"""Entidad Agencia (modelo SQLAlchemy)."""

from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class Agencia(Base):
    __tablename__ = "agencias"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(80))
    region: Mapped[str] = mapped_column(String(40))
    host: Mapped[str] = mapped_column(String(60))
    puerto: Mapped[int] = mapped_column(default=8080)
    plataforma: Mapped[str] = mapped_column(String(20), default="XAMPP")
    latencia_ms: Mapped[int] = mapped_column(default=20)
    activa: Mapped[bool] = mapped_column(default=True, nullable=False)
    ultima_sincronizacion: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    def __repr__(self) -> str:
        return f"Agencia(id={self.id}, codigo={self.codigo!r})"
