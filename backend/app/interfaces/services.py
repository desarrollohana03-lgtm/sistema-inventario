"""Contratos de casos de uso (ISP + DIP para la capa de aplicación)."""

from abc import ABC, abstractmethod

from app.application.schemas.producto import ProductoCreate
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
    def crear_producto(self, datos: ProductoCreate) -> Producto: ...

    @abstractmethod
    def eliminar_producto(self, producto_id: int) -> None: ...