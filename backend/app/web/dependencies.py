"""Composición de dependencias (DIP: se inyectan implementaciones concretas)."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.application.services.agencia_service import AgenciaService
from app.application.services.categoria_service import CategoriaService
from app.application.services.despacho_service import DespachoService
from app.application.services.ingreso_service import IngresoService
from app.application.services.producto_service import ProductoService
from app.infrastructure.database.session import get_db
from app.infrastructure.repositories.agencia_repository import AgenciaRepository
from app.infrastructure.repositories.categoria_repository import CategoriaRepository
from app.infrastructure.repositories.despacho_repository import DespachoRepository
from app.infrastructure.repositories.ingreso_repository import IngresoRepository
from app.infrastructure.repositories.producto_repository import ProductoRepository
from app.interfaces.repository import (
    AgenciaRepositoryContract,
    CategoriaRepositoryContract,
    DespachoRepositoryContract,
    IngresoRepositoryContract,
    ProductoRepositoryContract,
)
from app.interfaces.services import AgenciaService as AgenciaServiceContract
from app.interfaces.services import CategoriaService as CategoriaServiceContract
from app.interfaces.services import DespachoService as DespachoServiceContract
from app.interfaces.services import IngresoService as IngresoServiceContract
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


def get_agencia_repository(db: Session = Depends(get_db)) -> AgenciaRepositoryContract:
    return AgenciaRepository(db)


def get_agencia_service(
    repo: AgenciaRepositoryContract = Depends(get_agencia_repository),
) -> AgenciaServiceContract:
    return AgenciaService(repo)


def get_despacho_repository(db: Session = Depends(get_db)) -> DespachoRepositoryContract:
    return DespachoRepository(db)


def get_despacho_service(
    repo: DespachoRepositoryContract = Depends(get_despacho_repository),
) -> DespachoServiceContract:
    return DespachoService(repo)


def get_ingreso_repository(db: Session = Depends(get_db)) -> IngresoRepositoryContract:
    return IngresoRepository(db)


def get_ingreso_service(
    repo: IngresoRepositoryContract = Depends(get_ingreso_repository),
) -> IngresoServiceContract:
    return IngresoService(repo)