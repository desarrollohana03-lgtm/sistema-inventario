"""Creación de tablas y datos semilla."""

from sqlalchemy.orm import Session

from app.domain.entities import Categoria, Producto
from app.infrastructure.database.base import Base
from app.infrastructure.database.session import engine


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def seed_db(db: Session) -> None:
    create_tables()
    try:
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
    finally:
        db.close()