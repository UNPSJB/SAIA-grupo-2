import logging
from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.capacidades.models import Capacidad
from src.capacidades import schemas, exceptions

# Creacion de logger para modulo
logger=logging.getLogger(__name__)

# CRUD

def crear_capacidad(db: Session, capacidad:schemas.CapacidadCreate) -> schemas.Capacidad:
    _capacidad = Capacidad(**capacidad.model_dump())
    db.add(_capacidad)
    db.commit()
    db.refresh(_capacidad)
    return _capacidad

def listar_capacidades(db: Session) -> List[schemas.Capacidad]:
    logger.info("Listando capacidades desde services")
    return db.scalars(select(Capacidad)).all()

def leer_capacidad(db: Session, capacidad_id: int) -> schemas.Capacidad:
    db_capacidad = db.scalar(select(Capacidad).where(Capacidad.id == capacidad_id))
    if db_capacidad is None:
        raise exceptions.CapacidadNoEncontrada()
    return db_capacidad

def modificar_capacidad(
    db: Session, capacidad_id: int, capacidad: schemas.CapacidadUpdate
) -> Capacidad:
    db_capacidad = leer_capacidad(db, capacidad_id)
    db.execute(
        update(Capacidad).where(Capacidad.id == capacidad_id).values(**capacidad.model_dump())
    )
    db.commit()
    db.refresh(db_capacidad)
    return db_capacidad

def eliminar_capacidad(db: Session, capacidad_id: int) -> schemas.Capacidad:
    db_capacidad = leer_capacidad(db, capacidad_id)
    db.execute(delete(Capacidad).where(Capacidad.id == capacidad_id))
    db.commit()
    return db_capacidad