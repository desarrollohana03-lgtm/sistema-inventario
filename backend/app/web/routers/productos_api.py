"""API JSON de Productos."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.application.schemas.producto import (
    ProductoCreate,
    ProductoOut,
    ProductoStockAdjust,
    ProductoUpdate,
)
from app.interfaces.services import ProductoService as ProductoServiceContract
from app.web.dependencies import get_producto_service

router = APIRouter(prefix="/api/productos", tags=["productos"])


@router.get("", response_model=list[ProductoOut])
def listar_productos(
    term: str | None = Query(default=None),
    categoria_id: int | None = Query(default=None),
    stock_min: int | None = Query(default=None, ge=0),
    service: ProductoServiceContract = Depends(get_producto_service),
):
    return [
        ProductoOut.model_validate(p)
        for p in service.list_productos(term=term, categoria_id=categoria_id, stock_min=stock_min)
    ]


@router.post("", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
def crear_producto(
    payload: ProductoCreate,
    service: ProductoServiceContract = Depends(get_producto_service),
):
    return ProductoOut.model_validate(service.crear_producto(payload))


@router.patch("/{producto_id}/stock", response_model=ProductoOut)
def ajustar_stock(
    producto_id: int,
    payload: ProductoStockAdjust,
    service: ProductoServiceContract = Depends(get_producto_service),
):
    try:
        producto = service.actualizar_stock(
            producto_id, stock=payload.stock, delta=payload.delta
        )
        return ProductoOut.model_validate(producto)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.put("/{producto_id}", response_model=ProductoOut)
def actualizar_producto(
    producto_id: int,
    payload: ProductoUpdate,
    service: ProductoServiceContract = Depends(get_producto_service),
):
    try:
        producto = service.actualizar_producto(producto_id, payload)
        return ProductoOut.model_validate(producto)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    service: ProductoServiceContract = Depends(get_producto_service),
):
    try:
        service.eliminar_producto(producto_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))