"""API JSON de Categorías."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.schemas.categoria import CategoriaCreate, CategoriaOut
from app.interfaces.services import CategoriaService as CategoriaServiceContract
from app.web.dependencies import get_categoria_service

router = APIRouter(prefix="/api/categorias", tags=["categorias"])


@router.get("", response_model=list[CategoriaOut])
def listar_categorias(
    service: CategoriaServiceContract = Depends(get_categoria_service),
):
    return [CategoriaOut.model_validate(c) for c in service.list_categorias()]


@router.post("", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
def crear_categoria(
    payload: CategoriaCreate,
    service: CategoriaServiceContract = Depends(get_categoria_service),
):
    try:
        return CategoriaOut.model_validate(
            service.crear_categoria(payload.nombre, payload.descripcion)
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))