"""Caso de uso / servicio de Agencias (SRP: lógica de negocio de agencias)."""

from app.domain.entities.agencia import Agencia
from app.interfaces.repository import AgenciaRepositoryContract
from app.interfaces.services import AgenciaService as AgenciaServiceContract


class AgenciaService(AgenciaServiceContract):
    def __init__(self, repo: AgenciaRepositoryContract) -> None:
        self._repo = repo

    def list_agencias(self) -> list[Agencia]:
        return self._repo.list()

    def contar_agencias(self) -> int:
        return self._repo.count()

    def contar_activas(self) -> int:
        return len(self._repo.list_activas())
