"""Repositorio concreto de Productos (LSP: satisface ProductoRepositoryContract)."""

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

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