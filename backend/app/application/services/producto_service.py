"""Caso de uso / servicio de Productos (SRP: lógica de negocio de productos)."""

from app.application.schemas.producto import ProductoCreate
from app.domain.entities.producto import Producto
from app.interfaces.repository import ProductoRepositoryContract
from app.interfaces.services import ProductoService as ProductoServiceContract


class ProductoService(ProductoServiceContract):
    def __init__(self, repo: ProductoRepositoryContract) -> None:
        self._repo = repo

    def list_productos(
        self,
        term: str | None = None,
        categoria_id: int | None = None,
        stock_min: int | None = None,
    ) -> list[Producto]:
        return self._repo.search(term, categoria_id, stock_min)

    def get_producto(self, producto_id: int) -> Producto | None:
        return self._repo.get(producto_id)

    def contar_productos(self) -> int:
        return self._repo.count()

    def sumar_stock(self) -> int:
        return self._repo.sum_stock()

    def sumar_deficit_stock(self, minimo: int) -> int:
        return self._repo.sum_deficit_stock(minimo)

    def stock_por_categoria(self) -> list[tuple[str, int]]:
        return self._repo.stock_por_categoria()

    def crear_producto(self, datos: ProductoCreate) -> Producto:
        producto = Producto(
            codigo=datos.codigo,
            nombre=datos.nombre,
            marca=datos.marca,
            talla=datos.talla,
            color=datos.color,
            precio=datos.precio,
            moneda=datos.moneda,
            stock=datos.stock,
            categoria_id=datos.categoria_id,
        )
        return self._repo.add(producto)

    def eliminar_producto(self, producto_id: int) -> None:
        producto = self.get_producto(producto_id)
        if producto is None:
            raise ValueError(f"No existe el producto #{producto_id}.")
        self._repo.delete(producto)