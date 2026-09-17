"""Composición de dependencias (DIP: se inyectan implementaciones concretas)."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.application.services.categoria_service import CategoriaService
from app.application.services.producto_service import ProductoService
from app.infrastructure.database.session import get_db
from app.infrastructure.repositories.categoria_repository import CategoriaRepository
from app.infrastructure.repositories.producto_repository import ProductoRepository
from app.interfaces.repository import CategoriaRepositoryContract, ProductoRepositoryContract
from app.interfaces.services import CategoriaService as CategoriaServiceContract
from app.interfaces.services import ProductoService as ProductoServiceContract


def get_categoria_repository(
    db: Session = Depends(get_db),
) -> CategoriaRepositoryContract:
    return CategoriaRepository(db)


def get_categoria_service(
    repo: CategoriaRepositoryContract = Depends(get_categoria_repository),
) -> CategoriaServiceContract:
    return CategoriaService(repo)


def get_producto_repository(db: Session = Depends(get_db)) -> ProductoRepositoryContract:
    return ProductoRepository(db)


def get_producto_service(
    repo: ProductoRepositoryContract = Depends(get_producto_repository),
) -> ProductoServiceContract:
    return ProductoService(repo)