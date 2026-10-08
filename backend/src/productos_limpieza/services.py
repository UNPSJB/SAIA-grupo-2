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


from fastapi import HTTPException
from src.tareas.models import Tarea, ConsumoEstimado

def obtener_impacto_producto(db: Session, producto_id: int) -> dict:
    db_producto = leer_producto(db, producto_id)
    consumos = db.scalars(
        select(ConsumoEstimado).where(ConsumoEstimado.producto_limpieza_id == producto_id)
    ).all()
    tarea_ids = [c.tarea_id for c in consumos]
    tareas = []
    if tarea_ids:
        tareas = list(db.scalars(select(Tarea).where(Tarea.id.in_(tarea_ids))).all())

    return {
        "stock": db_producto.stock,
        "tareas": [t.titulo for t in tareas]
    }

def eliminar_producto(db: Session, producto_id: int) -> schemas.ProductoLimpiezaDelete:
    db_producto = db.scalar(select(ProductoLimpieza).where(ProductoLimpieza.id == producto_id))
    if db_producto is None:
        raise exceptions.ProductoNoEncontrado()

    if db_producto.activo:
        raise HTTPException(
            status_code=400,
            detail="Los productos activos no se pueden eliminar físicamente. Primero debe darlo de baja lógica."
        )

    consumos = db.scalars(
        select(ConsumoEstimado).where(ConsumoEstimado.producto_limpieza_id == producto_id)
    ).all()
    if consumos:
        tarea_ids = [c.tarea_id for c in consumos]
        tareas = db.scalars(select(Tarea).where(Tarea.id.in_(tarea_ids))).all()
        titulos = ", ".join(t.titulo for t in tareas)
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar físicamente este producto porque se encuentra asignado en las tareas: {titulos}."
        )

    try:
        db.execute(delete(ProductoLimpieza).where(ProductoLimpieza.id == producto_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar físicamente el producto porque posee registros históricos guardados."
        )
    return {"id": producto_id, "msg": "borrado"}
