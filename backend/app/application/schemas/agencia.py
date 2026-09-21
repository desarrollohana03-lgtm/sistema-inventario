"""DTOs de Agencia (salida de la capa de aplicación)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AgenciaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    nombre: str
    region: str
    host: str
    puerto: int
    plataforma: str
    latencia_ms: int
    activa: bool
    ultima_sincronizacion: datetime | None = None
