"""Caso de uso / servicio de Despachos (SRP: métricas operativas de despacho)."""

from datetime import datetime, timedelta

from app.domain.entities.despacho import Despacho
from app.domain.enums import EstadoDespacho
from app.interfaces.repository import DespachoRepositoryContract
from app.interfaces.services import DespachoService as DespachoServiceContract


class DespachoService(DespachoServiceContract):
    def __init__(self, repo: DespachoRepositoryContract) -> None:
        self._repo = repo

    def total_despachos(self) -> int:
        return self._repo.count_total(EstadoDespacho.COMPLETADA)

    def variacion_semanal_pct(self) -> float:
        """% de despachos completados: últimos 7 días vs. los 7 días previos."""
        ahora = datetime.now()
        actual = self._repo.count_between(
            ahora - timedelta(days=7), ahora, EstadoDespacho.COMPLETADA
        )
        previo = self._repo.count_between(
            ahora - timedelta(days=14),
            ahora - timedelta(days=7),
            EstadoDespacho.COMPLETADA,
        )
        if previo > 0:
            return round((actual - previo) / previo * 100, 1)
        return 100.0 if actual > 0 else 0.0

    def despachos_recientes(self, limite: int = 20) -> list[Despacho]:
        return self._repo.list_recientes(limite)
