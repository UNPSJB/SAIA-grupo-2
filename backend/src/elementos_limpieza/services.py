import logging
from datetime import date
from typing import List

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.elementos_limpieza import exceptions, schemas
from src.elementos_limpieza.constants import EstadoRecambio
from src.elementos_limpieza.models import ElementoLimpieza

logger = logging.getLogger(__name__)

ESTADOS_QUE_ALERTAN = (EstadoRecambio.VENCIDO, EstadoRecambio.PROXIMO)


def crear_elemento(
    db: Session, elemento: schemas.ElementoLimpiezaCreate
) -> schemas.ElementoLimpieza:
    if elemento.fecha_ultimo_recambio is not None and elemento.fecha_ultimo_recambio > date.today():
        raise exceptions.FechaFutura()

    datos = elemento.model_dump(exclude_none=True)
    _elemento = ElementoLimpieza(**datos)
    db.add(_elemento)
    db.commit()
    db.refresh(_elemento)
    return _elemento


def listar_elementos(db: Session) -> List[schemas.ElementoLimpieza]:
    logger.info("Listando elementos de limpieza desde services")
    return db.scalars(select(ElementoLimpieza)).all()


from fastapi import HTTPException

def listar_alertas(db: Session) -> List[schemas.ElementoLimpieza]:
    """Elementos vencidos o proximos a vencer, los mas urgentes primero."""
    logger.info("Calculando alertas de recambio desde services")
    elementos = db.scalars(select(ElementoLimpieza).where(ElementoLimpieza.activo == True)).all()

    alertas = [e for e in elementos if e.estado_recambio in ESTADOS_QUE_ALERTAN]
    alertas.sort(key=lambda e: e.fecha_proximo_recambio)
    return alertas

def eliminar_elemento(
    db: Session, elemento_id: int
) -> schemas.ElementoLimpiezaDelete:
    db_elemento = db.scalar(select(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id))
    if db_elemento is None:
        raise exceptions.ElementoNoEncontrado()

    if db_elemento.activo:
        raise HTTPException(
            status_code=400,
            detail="Los elementos activos no se pueden eliminar físicamente. Primero debe darlo de baja lógica."
        )

    try:
        db.execute(delete(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ElementoEnUso()
    return {"id": elemento_id, "msg": "borrado"}


def leer_elemento(db: Session, elemento_id: int) -> schemas.ElementoLimpieza:
    db_elemento = db.scalar(
        select(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id)
    )
    if db_elemento is None:
        raise exceptions.ElementoNoEncontrado()
    return db_elemento


def modificar_elemento(
    db: Session, elemento_id: int, elemento: schemas.ElementoLimpiezaUpdate
) -> schemas.ElementoLimpieza:
    db_elemento = leer_elemento(db, elemento_id)

    datos = elemento.model_dump()
    if datos.get("fecha_ultimo_recambio") is None:
        datos.pop("fecha_ultimo_recambio", None)
    elif datos["fecha_ultimo_recambio"] > date.today():
        raise exceptions.FechaFutura()

    db.execute(
        update(ElementoLimpieza)
        .where(ElementoLimpieza.id == elemento_id)
        .values(**datos)
    )
    db.commit()
    db.refresh(db_elemento)
    return db_elemento


def registrar_recambio(
    db: Session, elemento_id: int, recambio: schemas.RecambioCreate
) -> schemas.ElementoLimpieza:
    """Mueve la fecha base del elemento. La proxima alerta se recalcula sola."""
    db_elemento = leer_elemento(db, elemento_id)

    if db_elemento.frecuencia_recambio_dias is None:
        raise exceptions.SinFrecuencia()

    fecha = recambio.fecha_recambio or date.today()
    if fecha > date.today():
        raise exceptions.FechaFutura()

    db_elemento.fecha_ultimo_recambio = fecha
    db.commit()
    db.refresh(db_elemento)
    return db_elemento


def eliminar_elemento(
    db: Session, elemento_id: int
) -> schemas.ElementoLimpiezaDelete:
    db_elemento = db.scalar(select(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id))
    if db_elemento is None:
        raise exceptions.ElementoNoEncontrado()

    if db_elemento.activo:
        raise HTTPException(
            status_code=400,
            detail="Los elementos activos no se pueden eliminar físicamente. Primero debe darlo de baja lógica."
        )

    try:
        db.execute(delete(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ElementoEnUso()
    return {"id": elemento_id, "msg": "borrado"}
