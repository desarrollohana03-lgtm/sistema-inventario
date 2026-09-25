"""DTOs de Configuracion. Los secretos NUNCA salen en las respuestas:
solo flags password_set / token_set."""

from datetime import datetime

from pydantic import BaseModel, Field


class ConfiguracionOut(BaseModel):
    db_host: str
    db_port: int
    db_user: str
    wa_number: str
    password_set: bool
    token_set: bool
    actualizado_en: datetime | None


class ConfiguracionUpdate(BaseModel):
    db_host: str = Field(min_length=1, max_length=60)
    db_port: int = Field(ge=1, le=65535)
    db_user: str = Field(min_length=1, max_length=60)
    db_password: str | None = Field(default=None, max_length=200)
    wa_number: str | None = Field(default=None, max_length=30)
    wa_token: str | None = Field(default=None, max_length=400)


class MysqlTestRequest(BaseModel):
    host: str = Field(min_length=1, max_length=60)
    port: int = Field(ge=1, le=65535)
    user: str = Field(default="", max_length=60)
    password: str | None = Field(default=None, max_length=200)


class MysqlTestResult(BaseModel):
    ok: bool
    latency_ms: int | None = None
    error: str | None = None


class WhatsappTestRequest(BaseModel):
    token: str | None = Field(default=None, max_length=400)


class WhatsappTestResult(BaseModel):
    ok: bool
    verified: bool = False
    error: str | None = None


class ServidorMap(BaseModel):
    codigo: str = Field(min_length=2, max_length=10)
    host: str = Field(min_length=1, max_length=60)
    puerto: int = Field(ge=1, le=65535)
