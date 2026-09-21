"""Creación de tablas y datos semilla."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.domain.entities import Agencia, Categoria, Producto
from app.infrastructure.database.base import Base
from app.infrastructure.database.session import engine


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def _seed_catalogo(db: Session) -> None:
    if db.query(Categoria).count() > 0:
        return

    calzado = Categoria(nombre="Calzado", descripcion="Tenis, botas y zapatos")
    ropa = Categoria(nombre="Ropa", descripcion="Camisas, pantalones y accesorios")
    db.add_all([calzado, ropa])
    db.flush()

    db.add_all(
        [
            Producto(
                codigo="CAL-001",
                nombre="Tenis Runner Air",
                marca="Nike",
                talla="42",
                color="Negro",
                precio=85.00,
                stock=12,
                categoria=calzado,
            ),
            Producto(
                codigo="CAL-002",
                nombre="Bota Urban",
                marca="Cat",
                talla="40",
                color="Café",
                precio=120.50,
                stock=4,
                categoria=calzado,
            ),
            Producto(
                codigo="ROP-001",
                nombre="Camisa Oxford",
                marca="Tommy",
                talla="M",
                color="Blanco",
                precio=45.00,
                stock=30,
                categoria=ropa,
            ),
            Producto(
                codigo="ROP-002",
                nombre="Chaqueta Denim",
                marca="Levi's",
                talla="L",
                color="Azul",
                precio=95.00,
                stock=0,
                categoria=ropa,
            ),
        ]
    )
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


def seed_db(db: Session) -> None:
    create_tables()
    try:
        _seed_catalogo(db)
        _seed_agencias(db)
    finally:
        db.close()