"""Repositorio concreto de Agencias (LSP: satisface AgenciaRepositoryContract)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities.agencia import Agencia
from app.infrastructure.repositories.base_repository import SQLAlchemyRepository
from app.interfaces.repository import AgenciaRepositoryContract


class AgenciaRepository(SQLAlchemyRepository[Agencia], AgenciaRepositoryContract):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Agencia)

    def list_activas(self) -> list[Agencia]:
        stmt = (
            select(Agencia)
            .where(Agencia.activa.is_(True))
            .order_by(Agencia.codigo)
        )
        return list(self._session.scalars(stmt))

    def get_by_codigo(self, codigo: str) -> Agencia | None:
        stmt = select(Agencia).where(Agencia.codigo == codigo)
        return self._session.scalars(stmt).first()
