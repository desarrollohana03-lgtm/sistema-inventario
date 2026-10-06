"""API JSON de Productos."""

import csv
import io
import re
import unicodedata
from decimal import Decimal, InvalidOperation

import openpyxl
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.schemas.producto import (
    ProductoCreate,
    ProductoOut,
    ProductoStockAdjust,
    ProductoUpdate,
)
from app.domain.entities.producto import Producto
from app.infrastructure.database.session import get_db
from app.interfaces.services import ProductoService as ProductoServiceContract
from app.web.dependencies import get_producto_service

router = APIRouter(prefix="/api/productos", tags=["productos"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB duros para cualquier archivo
CATEGORIAS_POR_NOMBRE = {"calzado": 1, "ropa": 2, "accesorios": 3}
_RE_CABECERA_CODIGO = re.compile(r"^c[oó]digo\b", re.IGNORECASE)
_RE_SIMBOLO_MONEDA = re.compile(r"(?i)\s*(?:us\$|bs\.?|bol[ií]vares?|\$|€)\s*")
_RE_MILES_PURO = re.compile(r"^-?\d{1,3}(?:\.\d{3})+$")


class FilaInvalida(BaseModel):
    fila: int
    codigo: str | None = None
    motivo: str


class BulkImportOut(BaseModel):
    creados: int
    total_filas: int
    codigos: list[str]


def _normalizar_texto(valor: object) -> str:
    """Texto plano: sin acentos, en minúsculas, colapsado (para categorías)."""
    if valor is None:
        return ""
    texto = unicodedata.normalize("NFKD", str(valor))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return texto.strip().lower()


def _parse_decimal_es(valor: object) -> Decimal:
    """Convierte números con formato es-VE ('1.020,00' -> 1020.00).

    Acepta: float/int nativos (celdas reales de Excel), 'Bs 1.020,00',
    '1,020.50' (punto decimal inglés con miles por comas) y '1020'.
    """
    if valor is None:
        return Decimal("0.00")
    if isinstance(valor, bool):
        raise ValueError("booleano no es un número válido")
    if isinstance(valor, (int, float)):
        return Decimal(str(round(float(valor), 2))).quantize(Decimal("0.01"))
    if isinstance(valor, Decimal):
        return valor.quantize(Decimal("0.01"))

    s = str(valor).strip()
    if not s:
        return Decimal("0.00")
    s = _RE_SIMBOLO_MONEDA.sub("", s).replace("\u00a0", "").replace(" ", "")
    if not s:
        return Decimal("0.00")

    if "," in s:
        # Formato hispano: punto = separador de miles, coma = decimal.
        s = s.replace(".", "").replace(",", ".")
    elif _RE_MILES_PURO.match(s):
        # '1.020' sin comas: grupos de miles separados por punto.
        s = s.replace(".", "")

    try:
        return Decimal(s).quantize(Decimal("0.01"))
    except InvalidOperation as exc:
        raise ValueError(f"'{valor}' no es un número válido") from exc


def _parse_entero_es(valor: object) -> int:
    """Entero estricto (stock): rechaza decimales con fracción no nula."""
    dec = _parse_decimal_es(valor)
    if dec != dec.to_integral_value():
        raise ValueError(f"'{valor}' no es un entero válido")
    numero = int(dec)
    if numero < 0:
        raise ValueError(f"'{valor}' es negativo")
    return numero


def _celda_a_str(valor: object) -> str:
    return "" if valor is None else str(valor).strip()


def _iterar_filas_xlsx(content: bytes) -> list[list[object]]:
    """Lee .xlsx en modo stream (read_only) y devuelve las filas crudas."""
    wb = openpyxl.load_workbook(
        io.BytesIO(content), read_only=True, data_only=True
    )
    try:
        hoja = wb.active
        filas = [list(fila) for fila in hoja.iter_rows(values_only=True)]
    finally:
        wb.close()
    return filas


def _iterar_filas_csv(content: bytes) -> list[list[str]]:
    """Lee CSV con el módulo nativo: respeta comas entre comillas y
    saltos de línea embebidos dentro de celdas."""
    try:
        texto = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        texto = content.decode("cp1252", errors="replace")

    # Sniff del delimitador sobre la primera línea; si no se puede detectar,
    # se cae al reader por defecto (coma) sin romper el flujo.
    reader_kwargs: dict = {}
    primera = texto.splitlines()[0] if texto.splitlines() else ""
    if primera:
        try:
            dialecto = csv.Sniffer().sniff(primera, delimiters=",;\t")
            reader_kwargs["delimiter"] = dialecto.delimiter
            reader_kwargs["quotechar"] = dialecto.quotechar
        except csv.Error:
            pass

    lector = csv.reader(io.StringIO(texto, newline=""), **reader_kwargs)
    return [list(fila) for fila in lector]


def _procesar_filas(filas: list[list[object]]) -> tuple[list[dict], list[FilaInvalida], list[str]]:
    """Mapea filas crudas -> payloads validados, con errores por número de fila.

    Formato de columnas: codigo;nombre;categoria;talla;precio;stock
    (cabecera opcional: se omite la fila 1 si la primera celda dice 'código').
    """
    validos: list[dict] = []
    invalidas: list[FilaInvalida] = []
    vistos: dict[str, int] = {}

    for idx, fila in enumerate(filas, start=1):
        celdas = [_celda_a_str(c) for c in fila] + [""] * 6
        if not any(celdas[:6]):
            continue  # fila totalmente vacía

        if idx == 1 and _RE_CABECERA_CODIGO.match(celdas[0]):
            continue  # fila de cabecera

        codigo = celdas[0].upper()
        nombre = celdas[1]
        categoria_txt = _normalizar_texto(celdas[2])
        talla = celdas[3] or None

        if not codigo:
            invalidas.append(FilaInvalida(fila=idx, motivo="Falta el código"))
            continue
        if len(codigo) > 40:
            invalidas.append(
                FilaInvalida(fila=idx, codigo=codigo[:40], motivo="Código mayor de 40 caracteres")
            )
            continue
        if not nombre:
            invalidas.append(FilaInvalida(fila=idx, codigo=codigo, motivo="Falta el nombre"))
            continue
        if codigo in vistos:
            invalidas.append(
                FilaInvalida(
                    fila=idx,
                    codigo=codigo,
                    motivo=f"Código duplicado dentro del archivo (repite la fila {vistos[codigo]})",
                )
            )
            continue

        if categoria_txt == "":
            categoria_id = None
        elif categoria_txt in CATEGORIAS_POR_NOMBRE:
            categoria_id = CATEGORIAS_POR_NOMBRE[categoria_txt]
        else:
            invalidas.append(
                FilaInvalida(
                    fila=idx,
                    codigo=codigo,
                    motivo=f"Categoría desconocida '{celdas[2]}' (válidas: calzado, ropa, accesorios)",
                )
            )
            continue

        try:
            precio = _parse_decimal_es(celdas[4])
            stock = _parse_entero_es(celdas[5] if celdas[5] else 0)
        except ValueError as exc:
            invalidas.append(FilaInvalida(fila=idx, codigo=codigo, motivo=str(exc)))
            continue

        if precio < 0:
            invalidas.append(FilaInvalida(fila=idx, codigo=codigo, motivo="Precio negativo"))
            continue

        vistos[codigo] = idx
        validos.append(
            {
                "codigo": codigo,
                "nombre": nombre[:120],
                "talla": talla[:20] if talla else None,
                "precio": precio,
                "stock": stock,
                "categoria_id": categoria_id,
            }
        )

    return validos, invalidas, list(vistos.keys())


@router.post(
    "/bulk-import",
    response_model=BulkImportOut,
    status_code=status.HTTP_201_CREATED,
)
def bulk_import_productos(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Importación atómica de catálogo desde .xlsx (openpyxl) o .csv (stdlib).

    Todo-o-nada: cualquier fila inválida, código duplicado dentro del archivo,
    colisión con la base de datos o error de inserción aborta la transacción
    completa (rollback) — nunca queda un catálogo a medias.
    """
    nombre_archivo = (file.filename or "").lower()
    if nombre_archivo.endswith(".xls"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "motivo": "formato",
                "mensaje": "Excel 97-2003 (.xls) no soportado. Guárdelo como .xlsx o .csv.",
            },
        )
    if not nombre_archivo.endswith((".xlsx", ".csv")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "motivo": "formato",
                "mensaje": "Formato no soportado. Suba un archivo .xlsx o .csv.",
            },
        )

    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "motivo": "tamano",
                "mensaje": f"El archivo supera el límite de {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            },
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"motivo": "vacio", "mensaje": "El archivo está vacío."},
        )

    try:
        if nombre_archivo.endswith(".xlsx"):
            filas = _iterar_filas_xlsx(content)
        else:
            filas = _iterar_filas_csv(content)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "motivo": "parseo",
                "mensaje": f"No se pudo leer el archivo: {exc}. Verifique que sea un .xlsx/.csv válido.",
            },
        )

    validos, invalidas, codigos = _procesar_filas(filas)

    if not validos and not invalidas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"motivo": "vacio", "mensaje": "El archivo no contiene filas de datos."},
        )

    # 1) Cualquier fila inválida aborta TODO el lote (atomicidad por diseño).
    if invalidas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "motivo": "filas_invalidas",
                "mensaje": f"{len(invalidas)} fila(s) inválida(s): no se importó nada.",
                "filas_invalidas": [i.model_dump() for i in invalidas[:50]],
            },
        )

    # 2) Colisión con la BD en UNA sola consulta batch.
    existentes = (
        db.query(Producto.codigo)
        .filter(Producto.codigo.in_(codigos))
        .all()
    )
    colisiones = sorted({c for (c,) in existentes})
    if colisiones:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "motivo": "codigos_existentes",
                "mensaje": (
                    f"{len(colisiones)} código(s) ya existen en el catálogo: "
                    "no se importó nada."
                ),
                "codigos_ya_existentes": colisiones[:100],
            },
        )

    # 3) Inserción en una transacción estricta: commit sólo si el 100% va bien.
    try:
        objetos = [
            Producto(
                codigo=r["codigo"],
                nombre=r["nombre"],
                talla=r["talla"],
                precio=r["precio"],
                stock=r["stock"],
                categoria_id=r["categoria_id"],
            )
            for r in validos
        ]
        db.add_all(objetos)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "motivo": "transaccion",
                "mensaje": "Error al guardar el lote; la transacción fue revertida por completo.",
            },
        )

    return BulkImportOut(
        creados=len(objetos),
        total_filas=len(filas),
        codigos=[o.codigo for o in objetos][:200],
    )


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