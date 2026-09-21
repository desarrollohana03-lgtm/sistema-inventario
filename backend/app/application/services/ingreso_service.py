"""Caso de uso / servicio de Ingresos (entradas de stock al central)."""

from datetime import datetime, timedelta

from app.domain.entities.ingreso import Ingreso
from app.interfaces.repository import IngresoRepositoryContract
from app.interfaces.services import IngresoService as IngresoServiceContract


class IngresoService(IngresoServiceContract):
    def __init__(self, repo: IngresoRepositoryContract) -> None:
        self._repo = repo

    def ingresos_ultimos_dias(self, dias: int) -> int:
        ahora = datetime.now()
        return self._repo.count_between(ahora - timedelta(days=dias), ahora)

    def total_ingresos(self) -> int:
        return self._repo.count_total()

    def productos_movilizados_ultimos_dias(self, dias: int) -> set[int]:
        desde = datetime.now() - timedelta(days=dias)
        return set(self._repo.productos_movilizados_desde(desde))
