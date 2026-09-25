import logging
from typing import List

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.productos_limpieza import exceptions, schemas
from src.productos_limpieza.models import ProductoLimpieza

logger = logging.getLogger(__name__)


def crear_producto(
    db: Session, producto: schemas.ProductoLimpiezaCreate
) -> schemas.ProductoLimpieza:
    duplicado = db.scalar(
        select(ProductoLimpieza).where(ProductoLimpieza.nombre == producto.nombre)
    )
    if duplicado is not None:
        raise exceptions.NombreDuplicado()

    _producto = ProductoLimpieza(**producto.model_dump())
    db.add(_producto)
    db.commit()
    db.refresh(_producto)
    return _producto


def listar_productos(db: Session) -> List[schemas.ProductoLimpieza]:
    logger.info("Listando productos de limpieza desde services")
    return db.scalars(select(ProductoLimpieza)).all()


def listar_productos_con_stock(db: Session) -> List[schemas.ProductoLimpieza]:
    return db.scalars(select(ProductoLimpieza).where(ProductoLimpieza.stock > 0)).all()


def leer_producto(db: Session, producto_id: int) -> schemas.ProductoLimpieza:
    db_producto = db.scalar(
        select(ProductoLimpieza).where(ProductoLimpieza.id == producto_id)
    )
    if db_producto is None:
        raise exceptions.ProductoNoEncontrado()
    return db_producto


def modificar_producto(
    db: Session, producto_id: int, producto: schemas.ProductoLimpiezaUpdate
) -> schemas.ProductoLimpieza:
    db_producto = leer_producto(db, producto_id)

    duplicado = db.scalar(
        select(ProductoLimpieza)
        .where(ProductoLimpieza.nombre == producto.nombre)
        .where(ProductoLimpieza.id != producto_id)
    )
    if duplicado is not None:
        raise exceptions.NombreDuplicado()

    db.execute(
        update(ProductoLimpieza)
        .where(ProductoLimpieza.id == producto_id)
        .values(**producto.model_dump())
    )
    db.commit()
    db.refresh(db_producto)
    return db_producto


def descontar_stock(db: Session, producto_id: int, cantidad: float) -> ProductoLimpieza:
    db_producto = leer_producto(db, producto_id)
    if db_producto.stock - cantidad < 0:
        raise exceptions.StockNegativo()
    db_producto.stock -= cantidad
    return db_producto


def eliminar_producto(db: Session, producto_id: int) -> schemas.ProductoLimpiezaDelete:
    leer_producto(db, producto_id)
    try:
        db.execute(delete(ProductoLimpieza).where(ProductoLimpieza.id == producto_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ProductoEnUso()
    return {"id": producto_id, "msg": "borrado"}
