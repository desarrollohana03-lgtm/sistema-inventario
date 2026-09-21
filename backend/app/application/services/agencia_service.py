from datetime import datetime
import random

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

    def get_agencia_por_codigo(self, codigo: str) -> Agencia | None:
        return self._repo.get_by_codigo(codigo)

    def ping_agencia(self, codigo: str) -> Agencia:
        agencia = self._repo.get_by_codigo(codigo)
        if agencia is None:
            raise ValueError(f"No existe la agencia {codigo}.")

        # Actualiza latencia simulada con jitter y última sincronización a ahora
        nueva_latencia = max(5, agencia.latencia_ms + random.randint(-4, 6))
        agencia.latencia_ms = nueva_latencia
        agencia.activa = True
        agencia.ultima_sincronizacion = datetime.now()

        return self._repo.update(agencia)
