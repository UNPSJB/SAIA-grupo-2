import logging
from typing import List
from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError

from src.asociaciones.empleado_capacidad import empleado_capacidad
from src.capacidades.models import Capacidad
from src.capacidades import schemas, exceptions

# Creacion de logger para modulo
logger = logging.getLogger(__name__)

# CRUD

def crear_capacidad(db: Session, capacidad: schemas.CapacidadCreate) -> schemas.Capacidad:
    _capacidad = Capacidad(**capacidad.model_dump())
    db.add(_capacidad)
    
    try:
        db.commit()
        db.refresh(_capacidad)
        return _capacidad
    except IntegrityError:
        # Hacemos rollback para que no se tranque la base de datos y lanzamos nuestro error
        db.rollback()
        raise exceptions.NombreDuplicado()

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
    
    try:
        db.commit()
        db.refresh(db_capacidad)
        return db_capacidad
    except IntegrityError:
        # También protegemos la edición por si intentan renombrar a una capacidad que ya existe
        db.rollback()
        raise exceptions.NombreDuplicado()

def eliminar_capacidad(db: Session, capacidad_id: int) -> schemas.Capacidad:
    db_capacidad = db.scalar(
        select(Capacidad)
        .options(selectinload(Capacidad.empleados)) # Evita que explote por "No estar vinculado a una sesion"
        .where(Capacidad.id == capacidad_id)
    )

    if db_capacidad is None:
        raise exceptions.CapacidadNoEncontrada()

    # BLOQUEO: Si la capacidad tiene empleados vinculados, devolvemos un Error 400
    if len(db_capacidad.empleados) > 0:
        raise HTTPException(status_code=400, detail="No se puede eliminar: Esta capacidad ya está asignada a uno o más empleados.")

    respuesta = schemas.Capacidad.model_validate(db_capacidad)
    
    # Como ya validamos que nadie usa la capacidad, simplemente la borramos
    db.execute(
        delete(Capacidad)
        .where(Capacidad.id == capacidad_id)
    )
    db.commit()
    return respuesta