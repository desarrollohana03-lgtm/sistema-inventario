"""Repositorio concreto de Productos (LSP: satisface ProductoRepositoryContract)."""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.domain.entities.categoria import Categoria
from app.domain.entities.producto import Producto
from app.infrastructure.repositories.base_repository import SQLAlchemyRepository
from app.interfaces.repository import ProductoRepositoryContract


class ProductoRepository(SQLAlchemyRepository[Producto], ProductoRepositoryContract):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Producto)

    def search(
        self,
        term: str | None = None,
        categoria_id: int | None = None,
        stock_min: int | None = None,
    ) -> list[Producto]:
        stmt = select(Producto)

        if term:
            pattern = f"%{term}%"
            stmt = stmt.where(
                or_(
                    Producto.nombre.ilike(pattern),
                    Producto.marca.ilike(pattern),
                    Producto.codigo.ilike(pattern),
                )
            )

        if categoria_id is not None:
            stmt = stmt.where(Producto.categoria_id == categoria_id)

        if stock_min is not None:
            stmt = stmt.where(Producto.stock >= stock_min)

        return list(self._session.scalars(stmt.order_by(Producto.nombre)))

    def sum_stock(self) -> int:
        return int(self._session.scalar(select(func.sum(Producto.stock))) or 0)

    def sum_deficit_stock(self, minimo: int) -> int:
        stmt = select(
            func.count(), func.coalesce(func.sum(Producto.stock), 0)
        ).where(Producto.stock < minimo)
        cantidad, stock_actual = self._session.execute(stmt).one()
        return int(cantidad * minimo - stock_actual)

    def stock_por_categoria(self) -> list[tuple[str, int]]:
        total = func.coalesce(func.sum(Producto.stock), 0)
        stmt = (
            select(Categoria.nombre, total)
            .select_from(Producto)
            .join(Categoria, Producto.categoria_id == Categoria.id, isouter=True)
            .group_by(Categoria.nombre)
            .order_by(total.desc(), Categoria.nombre)
        )
        return [
            (nombre or "Sin categoría", int(unidades))
            for nombre, unidades in self._session.execute(stmt)
        ]