"""Contratos de persistencia (ISP: interfaces pequeñas; DIP: dependencia en abstracciones)."""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Generic, TypeVar

from app.domain.entities.agencia import Agencia
from app.domain.entities.categoria import Categoria
from app.domain.entities.despacho import Despacho
from app.domain.entities.producto import Producto
from app.domain.enums import EstadoDespacho

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


class AgenciaRepositoryContract(Repository[Agencia]):
    @abstractmethod
    def list_activas(self) -> list[Agencia]: ...

    @abstractmethod
    def get_by_codigo(self, codigo: str) -> Agencia | None: ...


class ProductoRepositoryContract(Repository[Producto]):
    @abstractmethod
    def search(
        self,
        term: str | None = None,
        categoria_id: int | None = None,
        stock_min: int | None = None,
    ) -> list[Producto]: ...

    @abstractmethod
    def sum_stock(self) -> int:
        """Suma total de unidades en stock de todos los productos."""

    @abstractmethod
    def sum_deficit_stock(self, minimo: int) -> int:
        """Déficit total (unidades faltantes) respecto a un stock mínimo."""

    @abstractmethod
    def stock_por_categoria(self) -> list[tuple[str, int]]:
        """Unidades en stock agrupadas por nombre de categoría."""

    @abstractmethod
    def sum_valor_inventario(self) -> float:
        """Valor total del inventario: suma de (stock × precio) de todos los productos."""

    @abstractmethod
    def count_bajo_minimo(self, minimo: int) -> int:
        """Cantidad de productos con stock por debajo del mínimo."""

    @abstractmethod
    def pasillos_con_stock_bajo(self, minimo: int) -> int:
        """Pasillos distintos que contienen al menos un producto bajo el mínimo."""


class DespachoRepositoryContract(Repository[Despacho]):
    @abstractmethod
    def count_total(self, estado: EstadoDespacho | None = None) -> int:
        """Total de despachos, opcionalmente filtrados por estado."""

    @abstractmethod
    def count_between(
        self,
        inicio: datetime,
        fin: datetime,
        estado: EstadoDespacho | None = None,
    ) -> int:
        """Despachos cuya fecha cae en el rango [inicio, fin)."""

    @abstractmethod
    def list_recientes(self, limite: int = 20) -> list[Despacho]:
        """Despachos más recientes, ordenados por fecha descendente."""