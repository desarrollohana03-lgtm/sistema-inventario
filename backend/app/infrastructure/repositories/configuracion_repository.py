"""Repositorio concreto de Configuracion (singleton id=1)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities.configuracion import Configuracion
from app.infrastructure.repositories.base_repository import SQLAlchemyRepository
from app.interfaces.repository import ConfiguracionRepositoryContract


class ConfiguracionRepository(
    SQLAlchemyRepository[Configuracion], ConfiguracionRepositoryContract
):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Configuracion)

    def get_singleton(self) -> Configuracion | None:
        stmt = select(Configuracion).where(Configuracion.id == 1)
        return self._session.scalars(stmt).first()
