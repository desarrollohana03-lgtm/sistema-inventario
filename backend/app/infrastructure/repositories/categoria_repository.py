"""Repositorio concreto de Categorías (LSP: satisface CategoriaRepositoryContract)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.entities.categoria import Categoria
from app.infrastructure.repositories.base_repository import SQLAlchemyRepository
from app.interfaces.repository import CategoriaRepositoryContract


class CategoriaRepository(SQLAlchemyRepository[Categoria], CategoriaRepositoryContract):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Categoria)

    def get_by_nombre(self, nombre: str) -> Categoria | None:
        return self._session.scalar(
            select(Categoria).where(func.lower(Categoria.nombre) == nombre.lower())
        )