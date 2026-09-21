"""API JSON de Agencias."""

from fastapi import APIRouter, Depends

from app.application.schemas.agencia import AgenciaOut
from app.interfaces.services import AgenciaService as AgenciaServiceContract
from app.web.dependencies import get_agencia_service

router = APIRouter(prefix="/api/agencias", tags=["agencias"])


@router.get("", response_model=list[AgenciaOut])
def listar_agencias(
    service: AgenciaServiceContract = Depends(get_agencia_service),
):
    return [AgenciaOut.model_validate(a) for a in service.list_agencias()]
