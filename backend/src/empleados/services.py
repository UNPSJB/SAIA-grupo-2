import logging
from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.capacidades.models import Capacidad
from src.capacidades.constants import CAPACIDAD_POR_DEFECTO
from src.capacidades import exceptions as CapacidadesExceptions
from src.empleados.models import Empleado
from src.empleados import schemas, exceptions

# Creacion de logger para modulo
logger=logging.getLogger(__name__)

# CRUD
def crear_empleado(db: Session, empleado:schemas.EmpleadoCreate) -> schemas.Empleado:
    # Constantes para lectura (No existe definicion de "empleado" fuera de la funcion asi que se definen dentro de esta)
    CAPACIDADES_NO_ESPECIFICADAS = empleado.listaCapacidades is None
    LISTA_CAPACIDADES_VACIA = empleado.listaCapacidades == []

    if CAPACIDADES_NO_ESPECIFICADAS: # Asigna la capacidad por defecto (Constante en constants)
        capacidades = db.scalars(
            select(Capacidad).where(Capacidad.nombre == CAPACIDAD_POR_DEFECTO)
        ).all()
    elif LISTA_CAPACIDADES_VACIA: # Error si la list SI existe pero se encuentra vacia
        raise CapacidadesExceptions.CapacidadRequerida()
    else:
        capacidades = db.scalars(
            select(Capacidad).where(Capacidad.id.in_(empleado.listaCapacidades))
        ).all()

    if not capacidades or (
        empleado.listaCapacidades is not None
        and len(capacidades) != len(set(empleado.listaCapacidades))
    ):
        raise CapacidadesExceptions.CapacidadNoEncontrada()

    _empleado = Empleado(
        **empleado.model_dump(exclude={"listaCapacidades"}),
        capacidades=capacidades,
    )
    db.add(_empleado)
    db.commit()
    db.refresh(_empleado)
    return _empleado

def listar_empleados(db: Session) -> List[schemas.Empleado]:
    logger.info("Listando empleados desde services")
    return db.scalars(select(Empleado)).all()

def leer_empleado(db: Session, empleado_id: int) -> schemas.Empleado:
    db_empleado = db.scalar(select(Empleado).where(Empleado.id == empleado_id))
    if db_empleado is None:
        raise exceptions.EmpleadoNoEncontrado()
    return db_empleado

def modificar_empleado(
    db: Session, empleado_id: int, empleado: schemas.EmpleadoUpdate
) -> Empleado:
    #Buscamos el empleado existente
    db_empleado = leer_empleado(db, empleado_id)
    
    # Actualizamos los campos de texto normales
    db_empleado.nombre = empleado.nombre
    db_empleado.apellido = empleado.apellido

    #Si el frontend envió una lista de capacidades, actualizamos la relación
    if empleado.listaCapacidades is not None:
        if empleado.listaCapacidades == []:
            # Evita que lo dejen sin capacidades si es obligatorio
            raise CapacidadesExceptions.CapacidadRequerida()
            
        nuevas_capacidades = db.scalars(
            select(Capacidad).where(Capacidad.id.in_(empleado.listaCapacidades))
        ).all()

        if len(nuevas_capacidades) != len(set(empleado.listaCapacidades)):
            raise CapacidadesExceptions.CapacidadNoEncontrada()

        # Al reasignar la lista, SQLAlchemy limpia la tabla intermedia y pone los nuevos vínculos
        db_empleado.capacidades = nuevas_capacidades

    db.commit()
    db.refresh(db_empleado)
    return db_empleado

def eliminar_empleado(db: Session, empleado_id: int) -> schemas.Empleado:
    db_empleado = leer_empleado(db, empleado_id)
    db.delete(db_empleado)    
    db.commit()
    return db_empleado