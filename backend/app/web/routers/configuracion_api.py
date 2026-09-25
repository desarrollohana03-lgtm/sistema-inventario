"""API de Configuracion del Sistema (parametros tecnicos del nodo central)."""

from fastapi import APIRouter, Depends

from app.application.schemas.configuracion import (
    ConfiguracionOut,
    ConfiguracionUpdate,
    MysqlTestRequest,
    MysqlTestResult,
    ServidorMap,
    WhatsappTestRequest,
    WhatsappTestResult,
)
from app.domain.entities.configuracion import Configuracion
from app.interfaces.services import ConfiguracionService as ConfiguracionServiceContract
from app.web.dependencies import get_configuracion_service

router = APIRouter(prefix="/api/configuracion", tags=["configuracion"])


def _out(cfg: Configuracion) -> ConfiguracionOut:
    return ConfiguracionOut(
        db_host=cfg.db_host,
        db_port=cfg.db_port,
        db_user=cfg.db_user,
        wa_number=cfg.wa_number,
        password_set=bool(cfg.db_password_enc),
        token_set=bool(cfg.wa_token_enc),
        actualizado_en=cfg.actualizado_en,
    )


@router.get("", response_model=ConfiguracionOut)
def obtener_configuracion(
    service: ConfiguracionServiceContract = Depends(get_configuracion_service),
):
    return _out(service.obtener())


@router.put("", response_model=ConfiguracionOut)
def guardar_configuracion(
    datos: ConfiguracionUpdate,
    service: ConfiguracionServiceContract = Depends(get_configuracion_service),
):
    return _out(service.guardar(datos))


@router.post("/test-mysql", response_model=MysqlTestResult)
def probar_mysql(
    req: MysqlTestRequest,
    service: ConfiguracionServiceContract = Depends(get_configuracion_service),
):
    return MysqlTestResult(
        **service.probar_mysql(
            req.host, req.port, req.user, req.password or None
        )
    )


@router.post("/test-whatsapp", response_model=WhatsappTestResult)
def probar_whatsapp(
    req: WhatsappTestRequest,
    service: ConfiguracionServiceContract = Depends(get_configuracion_service),
):
    return WhatsappTestResult(**service.probar_whatsapp(req.token or None))


@router.put("/servidores")
def mapear_servidores(
    items: list[ServidorMap],
    service: ConfiguracionServiceContract = Depends(get_configuracion_service),
):
    n = service.mapear_servidores([(i.codigo, i.host, i.puerto) for i in items])
    return {"actualizados": n}
