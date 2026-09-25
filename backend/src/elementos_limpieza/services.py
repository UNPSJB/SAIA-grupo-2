import logging
from typing import List

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.elementos_limpieza import exceptions, schemas
from src.elementos_limpieza.models import ElementoLimpieza

logger = logging.getLogger(__name__)


def crear_elemento(
    db: Session, elemento: schemas.ElementoLimpiezaCreate
) -> schemas.ElementoLimpieza:
    _elemento = ElementoLimpieza(**elemento.model_dump())
    db.add(_elemento)
    db.commit()
    db.refresh(_elemento)
    return _elemento


def listar_elementos(db: Session) -> List[schemas.ElementoLimpieza]:
    logger.info("Listando elementos de limpieza desde services")
    return db.scalars(select(ElementoLimpieza)).all()


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
    db.execute(
        update(ElementoLimpieza)
        .where(ElementoLimpieza.id == elemento_id)
        .values(**elemento.model_dump())
    )
    db.commit()
    db.refresh(db_elemento)
    return db_elemento


def eliminar_elemento(
    db: Session, elemento_id: int
) -> schemas.ElementoLimpiezaDelete:
    leer_elemento(db, elemento_id)
    try:
        db.execute(delete(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ElementoEnUso()
    return {"id": elemento_id, "msg": "borrado"}
