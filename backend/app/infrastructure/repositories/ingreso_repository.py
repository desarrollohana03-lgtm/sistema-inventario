"""Repositorio concreto de Ingresos (LSP: satisface IngresoRepositoryContract)."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.entities.ingreso import Ingreso
from app.infrastructure.repositories.base_repository import SQLAlchemyRepository
from app.interfaces.repository import IngresoRepositoryContract


class IngresoRepository(SQLAlchemyRepository[Ingreso], IngresoRepositoryContract):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Ingreso)

    def count_between(self, inicio: datetime, fin: datetime) -> int:
        stmt = select(func.count()).select_from(Ingreso).where(
            Ingreso.fecha >= inicio, Ingreso.fecha < fin
        )
        return int(self._session.scalar(stmt) or 0)

    def count_total(self) -> int:
        return int(self._session.scalar(select(func.count()).select_from(Ingreso)) or 0)

    def productos_movilizados_desde(self, desde: datetime) -> list[int]:
        stmt = select(func.distinct(Ingreso.producto_id)).where(
            Ingreso.fecha >= desde, Ingreso.producto_id.isnot(None)
        )
        return [int(pid) for pid in self._session.scalars(stmt).all()]

    def list_recientes(self, limite: int = 20) -> list[Ingreso]:
        stmt = select(Ingreso).order_by(Ingreso.fecha.desc()).limit(limite)
        return list(self._session.scalars(stmt))
