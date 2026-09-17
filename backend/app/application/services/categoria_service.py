"""Caso de uso / servicio de Categorías (SRP: lógica de negocio de categorías)."""

from app.domain.entities.categoria import Categoria
from app.interfaces.repository import CategoriaRepositoryContract
from app.interfaces.services import CategoriaService as CategoriaServiceContract


class CategoriaService(CategoriaServiceContract):
    def __init__(self, repo: CategoriaRepositoryContract) -> None:
        self._repo = repo

    def list_categorias(self) -> list[Categoria]:
        return self._repo.list()

    def get_categoria(self, categoria_id: int) -> Categoria | None:
        return self._repo.get(categoria_id)

    def contar_categorias(self) -> int:
        return self._repo.count()

    def crear_categoria(self, nombre: str, descripcion: str | None = None) -> Categoria:
        if self._repo.get_by_nombre(nombre) is not None:
            raise ValueError(f"Ya existe la categoría «{nombre}».")
        return self._repo.add(Categoria(nombre=nombre, descripcion=descripcion))