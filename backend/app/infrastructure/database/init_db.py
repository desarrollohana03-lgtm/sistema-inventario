"""Creación de tablas y datos semilla."""

import random
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.domain.entities import Agencia, Categoria, Despacho, Producto
from app.domain.enums import EstadoDespacho
from app.infrastructure.database.base import Base
from app.infrastructure.database.session import engine


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def _seed_catalogo(db: Session) -> None:
    calzado = db.query(Categoria).filter(Categoria.nombre == "Calzado").first()
    if not calzado:
        calzado = Categoria(nombre="Calzado", descripcion="Tenis, botas, zapatillas y sandalias")
        db.add(calzado)

    ropa = db.query(Categoria).filter(Categoria.nombre == "Ropa").first()
    if not ropa:
        ropa = Categoria(nombre="Ropa", descripcion="Camisas, pantalones, polos y chaquetas")
        db.add(ropa)

    accesorios = db.query(Categoria).filter(Categoria.nombre == "Accesorios").first()
    if not accesorios:
        accesorios = Categoria(nombre="Accesorios", descripcion="Gorras, cinturones y bolsos de almacén")
        db.add(accesorios)

    db.flush()

    if db.query(Producto).count() < 10:
        productos_demo = [
            # Calzado (tallas 36 a 44)
            Producto(codigo="ZAP-HANA-36", nombre="Sandalia Relax", marca="Hana", talla="36", color="Negro", precio=42.00, stock=0, categoria=calzado),
            Producto(codigo="ZAP-HANA-37", nombre="Tenis Urbanista", marca="Nike", talla="37", color="Blanco", precio=65.00, stock=18, categoria=calzado),
            Producto(codigo="ZAP-HANA-38", nombre="Tenis Runner Air", marca="Nike", talla="38", color="Rojo/Negro", precio=85.00, stock=14, categoria=calzado),
            Producto(codigo="ZAP-HANA-39", nombre="Zapatilla Stellar Pro", marca="Adidas", talla="39", color="Gris Carbon", precio=98.00, stock=22, categoria=calzado),
            Producto(codigo="ZAP-HANA-40", nombre="Bota Urban", marca="Cat", talla="40", color="Café", precio=120.50, stock=4, categoria=calzado),
            Producto(codigo="ZAP-HANA-41", nombre="Botín Casual", marca="Timberland", talla="41", color="Miel", precio=110.00, stock=15, categoria=calzado),
            Producto(codigo="ZAP-HANA-42", nombre="Tenis Runner Air", marca="Nike", talla="42", color="Negro", precio=85.00, stock=12, categoria=calzado),
            Producto(codigo="ZAP-HANA-43", nombre="Tenis Urban Slide", marca="Puma", talla="43", color="Blanco", precio=76.00, stock=7, categoria=calzado),
            Producto(codigo="ZAP-HANA-44", nombre="Tenis Urban Slide", marca="Puma", talla="44", color="Negro", precio=76.00, stock=6, categoria=calzado),
            # Ropa (tallas S a XL)
            Producto(codigo="ROP-HANA-S", nombre="Polo Stellar", marca="Hana", talla="S", color="Negro", precio=28.00, stock=40, categoria=ropa),
            Producto(codigo="ROP-HANA-M", nombre="Camisa Oxford", marca="Tommy", talla="M", color="Blanco", precio=45.00, stock=30, categoria=ropa),
            Producto(codigo="ROP-HANA-L", nombre="Chaqueta Denim", marca="Levi's", talla="L", color="Azul", precio=95.00, stock=0, categoria=ropa),
            Producto(codigo="ROP-HANA-XL", nombre="Pantalón Chino", marca="Dockers", talla="XL", color="Beige", precio=60.00, stock=8, categoria=ropa),
            # Accesorios
            Producto(codigo="ACC-HANA-U", nombre="Gorra Urban Reflect", marca="Hana", talla="Única", color="Negro/Rojo", precio=15.00, stock=50, categoria=accesorios),
            Producto(codigo="ACC-HANA-B", nombre="Cinturón Táctico Almacén", marca="Hana", talla="M/L", color="Negro", precio=22.50, stock=16, categoria=accesorios),
        ]
        for p in productos_demo:
            existente = db.query(Producto).filter(Producto.codigo == p.codigo).first()
            if not existente:
                db.add(p)
        db.commit()


def _seed_agencias(db: Session) -> None:
    if db.query(Agencia).count() > 0:
        return

    ahora = datetime.now()
    db.add_all(
        [
            Agencia(
                codigo="AG31",
                nombre="Agencia Centro",
                region="Centro",
                host="10.0.0.31",
                puerto=8080,
                latencia_ms=12,
                ultima_sincronizacion=ahora - timedelta(minutes=7),
            ),
            Agencia(
                codigo="AG32",
                nombre="Agencia Este",
                region="Este",
                host="10.0.0.32",
                puerto=8080,
                latencia_ms=18,
                ultima_sincronizacion=ahora - timedelta(minutes=9),
            ),
            Agencia(
                codigo="AG37",
                nombre="Agencia Sur",
                region="Sur",
                host="10.0.0.37",
                puerto=8080,
                latencia_ms=24,
                ultima_sincronizacion=ahora - timedelta(minutes=14),
            ),
            Agencia(
                codigo="AG40",
                nombre="Agencia Oeste",
                region="Oeste",
                host="10.0.0.40",
                puerto=8080,
                latencia_ms=15,
                ultima_sincronizacion=ahora - timedelta(minutes=4),
            ),
        ]
    )
    db.commit()


def _seed_despachos(db: Session) -> None:
    if db.query(Despacho).count() > 0:
        return

    rnd = random.Random(2026)
    ahora = datetime.now()
    rutas = [
        ("Central", "AG31"),
        ("Central", "AG32"),
        ("Central", "AG37"),
        ("Central", "AG40"),
        ("AG31", "AG37"),
        ("AG32", "AG40"),
        ("AG37", "AG31"),
        ("AG40", "AG32"),
    ]
    # (días_inicio, días_fin, cantidad, solo_completadas)
    # Las dos primeras ventanas (últimos 14 días) son todas completadas para que
    # la variación semanal sea determinista y positiva; el resto mezcla estados.
    ventanas = [
        (0, 7, 20, True),
        (7, 14, 18, True),
        (14, 21, 17, False),
        (21, 28, 16, False),
        (28, 35, 15, False),
        (35, 42, 14, False),
        (42, 49, 14, False),
        (49, 56, 14, False),
    ]

    registros: list[Despacho] = []
    seq = 841
    for d0, d1, cantidad, solo_completadas in ventanas:
        for _ in range(cantidad):
            dias = rnd.randint(d0, d1 - 1)
            fecha = ahora - timedelta(
                days=dias, hours=rnd.randint(1, 23), minutes=rnd.randint(0, 59)
            )
            origen, destino = rnd.choice(rutas)
            if solo_completadas:
                estado = EstadoDespacho.COMPLETADA
            else:
                estado = rnd.choice(
                    [EstadoDespacho.COMPLETADA] * 10
                    + [EstadoDespacho.EN_TRANSITO, EstadoDespacho.ANULADA]
                )
            registros.append(
                Despacho(
                    codigo=f"TRF-2026-{seq:04d}",
                    origen=origen,
                    destino=destino,
                    articulos=rnd.randint(6, 30),
                    total=Decimal(str(round(rnd.uniform(300, 1500), 2))),
                    estado=estado,
                    fecha=fecha,
                )
            )
            seq += 1

    db.add_all(registros)
    db.commit()


def _ensure_pasillo_column(db: Session) -> None:
    """Añade la columna `pasillo` a `productos` en BD ya existentes (SQLite/MySQL).

    `create_all` no altera tablas existentes, así que la migramos a mano.
    """
    inspector = inspect(db.bind)
    if "productos" not in inspector.get_table_names():
        return
    columnas = {c["name"] for c in inspector.get_columns("productos")}
    if "pasillo" not in columnas:
        db.execute(text("ALTER TABLE productos ADD COLUMN pasillo VARCHAR(20)"))
        db.commit()


def _backfill_pasillos(db: Session) -> None:
    """Asigna un pasillo determinista a los productos que aún no lo tengan."""
    pendientes = db.scalars(
        select(Producto).where(Producto.pasillo.is_(None)).order_by(Producto.id)
    ).all()
    for i, producto in enumerate(pendientes):
        producto.pasillo = f"P-{(i % 6) + 1:02d}"
    db.commit()


def seed_db(db: Session) -> None:
    create_tables()
    try:
        _ensure_pasillo_column(db)
        _seed_catalogo(db)
        _seed_agencias(db)
        _seed_despachos(db)
        _backfill_pasillos(db)
    finally:
        db.close()