from fastapi import APIRouter, Depends, HTTPException, status

from app.application.schemas.agencia import AgenciaOut
from app.interfaces.services import AgenciaService as AgenciaServiceContract
from app.web.dependencies import get_agencia_service

router = APIRouter(prefix="/api/agencias", tags=["agencias"])


@router.get("", response_model=list[AgenciaOut])
def listar_agencias(
    service: AgenciaServiceContract = Depends(get_agencia_service),
):
    return [AgenciaOut.model_validate(a) for a in service.list_agencias()]


@router.post("/ping-all", response_model=list[AgenciaOut])
def ping_todas_las_agencias(
    service: AgenciaServiceContract = Depends(get_agencia_service),
):
    agencias = service.list_agencias()
    resultados = []
    for a in agencias:
        resultados.append(AgenciaOut.model_validate(service.ping_agencia(a.codigo)))
    return resultados


@router.post("/{codigo}/ping", response_model=AgenciaOut)
def ping_agencia(
    codigo: str,
    service: AgenciaServiceContract = Depends(get_agencia_service),
):
    try:
        agencia = service.ping_agencia(codigo)
        return AgenciaOut.model_validate(agencia)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
