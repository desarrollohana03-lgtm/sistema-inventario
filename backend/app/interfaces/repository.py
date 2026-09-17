"""Contratos de persistencia (ISP: interfaces pequeñas; DIP: dependencia en abstracciones)."""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from app.domain.entities.categoria import Categoria
from app.domain.entities.producto import Producto

T = TypeVar("T")


class Repository(ABC, Generic[T]):
    """Contrato genérico de acceso a datos."""

    @abstractmethod
    def get(self, entity_id: int) -> T | None: ...

    @abstractmethod
    def list(self) -> list[T]: ...

    @abstractmethod
    def add(self, entity: T) -> T: ...

    @abstractmethod
    def update(self, entity: T) -> T: ...

    @abstractmethod
    def delete(self, entity: T) -> None: ...

    @abstractmethod
    def count(self) -> int: ...


class CategoriaRepositoryContract(Repository[Categoria]):
    @abstractmethod
    def get_by_nombre(self, nombre: str) -> Categoria | None: ...


class ProductoRepositoryContract(Repository[Producto]):
    @abstractmethod
    def search(
        self,
        term: str | None = None,
        categoria_id: int | None = None,
        stock_min: int | None = None,
    ) -> list[Producto]: ...