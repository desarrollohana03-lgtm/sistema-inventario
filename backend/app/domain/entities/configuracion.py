"""Entidad Configuracion (modelo SQLAlchemy): fila unica con los parametros
tecnicos del nodo central. Los secretos se guardan cifrados (Fernet)."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class Configuracion(Base):
    __tablename__ = "configuracion"

    id: Mapped[int] = mapped_column(primary_key=True)  # siempre 1: singleton
    db_host: Mapped[str] = mapped_column(String(60), default="127.0.0.1")
    db_port: Mapped[int] = mapped_column(Integer, default=3306)
    db_user: Mapped[str] = mapped_column(String(60), default="root")
    db_password_enc: Mapped[str | None] = mapped_column(String(255), nullable=True)
    wa_token_enc: Mapped[str | None] = mapped_column(String(512), nullable=True)
    wa_number: Mapped[str] = mapped_column(String(30), default="")
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"Configuracion(id={self.id}, db={self.db_host}:{self.db_port})"
