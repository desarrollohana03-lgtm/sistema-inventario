"""Contratos de casos de uso (ISP + DIP para la capa de aplicación)."""

from abc import ABC, abstractmethod

from app.application.schemas.producto import ProductoCreate
from app.domain.entities.agencia import Agencia
from app.domain.entities.categoria import Categoria
from app.domain.entities.producto import Producto


class CategoriaService(ABC):
    @abstractmethod
    def list_categorias(self) -> list[Categoria]: ...

    @abstractmethod
    def get_categoria(self, categoria_id: int) -> Categoria | None: ...

    @abstractmethod
    def contar_categorias(self) -> int: ...

    @abstractmethod
    def crear_categoria(self, nombre: str, descripcion: str | None = None) -> Categoria: ...


class ProductoService(ABC):
    @abstractmethod
    def list_productos(
        self,
        term: str | None = None,
        categoria_id: int | None = None,
        stock_min: int | None = None,
    ) -> list[Producto]: ...

    @abstractmethod
    def get_producto(self, producto_id: int) -> Producto | None: ...

    @abstractmethod
    def contar_productos(self) -> int: ...

    @abstractmethod
    def sumar_stock(self) -> int:
        """Total de unidades en stock en todo el inventario."""
        ...

    @abstractmethod
    def sumar_deficit_stock(self, minimo: int) -> int:
        """Unidades que faltan para que todos los productos alcancen el mínimo."""
        ...

    @abstractmethod
    def stock_por_categoria(self) -> list[tuple[str, int]]:
        """Unidades en stock agrupadas por nombre de categoría."""
        ...

    @abstractmethod
    def crear_producto(self, datos: ProductoCreate) -> Producto: ...

    @abstractmethod
    def eliminar_producto(self, producto_id: int) -> None: ...


class AgenciaService(ABC):
    @abstractmethod
    def list_agencias(self) -> list[Agencia]: ...

    @abstractmethod
    def contar_agencias(self) -> int: ...

    @abstractmethod
    def contar_activas(self) -> int: ...