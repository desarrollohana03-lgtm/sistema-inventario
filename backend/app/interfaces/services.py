"""Contratos de casos de uso (ISP + DIP para la capa de aplicación)."""

from abc import ABC, abstractmethod

from app.application.schemas.producto import ProductoCreate, ProductoUpdate
from app.domain.entities.agencia import Agencia
from app.domain.entities.categoria import Categoria
from app.domain.entities.despacho import Despacho
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
    def valor_inventario(self) -> float:
        """Valor total del inventario (suma de stock × precio)."""
        ...

    @abstractmethod
    def alertas_stock_bajo(self, minimo: int) -> int:
        """Productos con stock por debajo del mínimo."""
        ...

    @abstractmethod
    def pasillos_criticos(self, minimo: int) -> int:
        """Pasillos distintos con al menos un producto bajo el mínimo."""
        ...

    @abstractmethod
    def crear_producto(self, datos: ProductoCreate) -> Producto: ...

    @abstractmethod
    def actualizar_producto(self, producto_id: int, datos: ProductoUpdate) -> Producto: ...

    @abstractmethod
    def actualizar_stock(
        self, producto_id: int, stock: int | None = None, delta: int | None = None
    ) -> Producto: ...

    @abstractmethod
    def eliminar_producto(self, producto_id: int) -> None: ...


class AgenciaService(ABC):
    @abstractmethod
    def list_agencias(self) -> list[Agencia]: ...

    @abstractmethod
    def contar_agencias(self) -> int: ...

    @abstractmethod
    def contar_activas(self) -> int: ...

    @abstractmethod
    def get_agencia_por_codigo(self, codigo: str) -> Agencia | None: ...

    @abstractmethod
    def ping_agencia(self, codigo: str) -> Agencia: ...


class DespachoService(ABC):
    @abstractmethod
    def total_despachos(self) -> int:
        """Total de despachos completados (histórico)."""
        ...

    @abstractmethod
    def variacion_semanal_pct(self) -> float:
        """Variación % de despachos: últimos 7 días vs. 7 días previos."""
        ...

    @abstractmethod
    def despachos_recientes(self, limite: int = 20) -> list[Despacho]:
        ...