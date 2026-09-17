"""Implementación genérica de repositorio sobre SQLAlchemy (OCP: extensible sin modificar)."""

from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.interfaces.repository import Repository

T = TypeVar("T")


class SQLAlchemyRepository(Repository[T], Generic[T]):
    def __init__(self, session: Session, model: type[T]) -> None:
        self._session = session
        self._model = model

    def get(self, entity_id: int) -> T | None:
        return self._session.get(self._model, entity_id)

    def list(self) -> list[T]:
        return list(self._session.scalars(select(self._model).order_by(self._model.id)))

    def add(self, entity: T) -> T:
        self._session.add(entity)
        self._session.commit()
        self._session.refresh(entity)
        return entity

    def update(self, entity: T) -> T:
        self._session.add(entity)
        self._session.commit()
        self._session.refresh(entity)
        return entity

    def delete(self, entity: T) -> None:
        self._session.delete(entity)
        self._session.commit()

    def count(self) -> int:
        return int(
            self._session.scalar(select(func.count()).select_from(self._model)) or 0
        )