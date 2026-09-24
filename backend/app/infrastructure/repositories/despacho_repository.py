"""Repositorio concreto de Despachos (LSP: satisface DespachoRepositoryContract)."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.entities.despacho import Despacho
from app.domain.enums import EstadoDespacho
from app.infrastructure.repositories.base_repository import SQLAlchemyRepository
from app.interfaces.repository import DespachoRepositoryContract


class DespachoRepository(SQLAlchemyRepository[Despacho], DespachoRepositoryContract):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Despacho)

    def count_total(self, estado: EstadoDespacho | None = None) -> int:
        stmt = select(func.count()).select_from(Despacho)
        if estado is not None:
            stmt = stmt.where(Despacho.estado == estado)
        return int(self._session.scalar(stmt) or 0)

    def count_between(
        self,
        inicio: datetime,
        fin: datetime,
        estado: EstadoDespacho | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(Despacho).where(
            Despacho.fecha >= inicio, Despacho.fecha < fin
        )
        if estado is not None:
            stmt = stmt.where(Despacho.estado == estado)
        return int(self._session.scalar(stmt) or 0)

    def list_recientes(self, limite: int = 20) -> list[Despacho]:
        stmt = select(Despacho).order_by(Despacho.fecha.desc()).limit(limite)
        return list(self._session.scalars(stmt))

    def list_desde(self, desde: datetime) -> list[Despacho]:
        stmt = (
            select(Despacho)
            .where(Despacho.fecha >= desde)
            .order_by(Despacho.fecha.desc())
        )
        return list(self._session.scalars(stmt))

    def productos_movilizados_desde(self, desde: datetime) -> list[int]:
        stmt = select(func.distinct(Despacho.producto_id)).where(
            Despacho.fecha >= desde, Despacho.producto_id.isnot(None)
        )
        return [int(pid) for pid in self._session.scalars(stmt).all()]
