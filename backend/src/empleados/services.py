import logging
from typing import List
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, selectinload

from src.asociaciones.empleado_capacidad import empleado_capacidad
from src.capacidades.models import Capacidad
from src.capacidades.constants import CAPACIDAD_POR_DEFECTO
from src.capacidades import exceptions as CapacidadesExceptions
from src.empleados.models import Empleado
from src.empleados import schemas, exceptions
from src.sectores.models import Sector

logger = logging.getLogger(__name__)

def generar_legajo(db: Session) -> str:
    """Genera un nuevo legajo secuencial."""
    ultimo_empleado = db.scalar(
        select(Empleado).order_by(desc(Empleado.id))
    )
    
    if ultimo_empleado and ultimo_empleado.legajo and ultimo_empleado.legajo.startswith("EMP-"):
        try:
            ultimo_numero = int(ultimo_empleado.legajo.split("-")[1])
            nuevo_numero = ultimo_numero + 1
            return f"EMP-{nuevo_numero}"
        except ValueError:
            return "EMP-1000"
    
    return "EMP-1000"

def crear_empleado(db: Session, empleado: schemas.EmpleadoCreate) -> schemas.Empleado:
    empleado_existente = db.scalar(select(Empleado).where(Empleado.dni == empleado.dni))
    if empleado_existente:
        raise exceptions.DniDuplicado()

    CAPACIDADES_NO_ESPECIFICADAS = empleado.listaCapacidades is None
    LISTA_CAPACIDADES_VACIA = empleado.listaCapacidades == []

    if CAPACIDADES_NO_ESPECIFICADAS:
        capacidades = db.scalars(
            select(Capacidad).where(Capacidad.nombre.ilike(CAPACIDAD_POR_DEFECTO))
        ).all()
    elif LISTA_CAPACIDADES_VACIA:
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
        
    sectores = []
    if empleado.listaSectores:
        sectores = db.scalars(
            select(Sector).where(Sector.id.in_(empleado.listaSectores))
        ).all()

    nuevo_legajo = generar_legajo(db)

   
    _empleado = Empleado(
        **empleado.model_dump(exclude={"listaCapacidades", "listaSectores"}),
        legajo=nuevo_legajo,
        capacidades=capacidades,
        sectores=sectores,
    )
    db.add(_empleado)
    db.commit()
    db.refresh(_empleado)
    return _empleado

def listar_empleados(db: Session) -> List[schemas.Empleado]:
    logger.info("Listando empleados desde services")
    return db.scalars(
        select(Empleado).options(selectinload(Empleado.capacidades), selectinload(Empleado.sectores))
    ).all()

def leer_empleado(db: Session, empleado_id: int) -> schemas.Empleado:
    db_empleado = db.scalar(
        select(Empleado)
        .options(selectinload(Empleado.capacidades), selectinload(Empleado.sectores))
        .where(Empleado.id == empleado_id)
    )
    if db_empleado is None:
        raise exceptions.EmpleadoNoEncontrado()
    return db_empleado

def modificar_empleado(
    db: Session, empleado_id: int, empleado: schemas.EmpleadoUpdate
) -> Empleado:
    db_empleado = db.scalar(
        select(Empleado)
        .options(selectinload(Empleado.capacidades), selectinload(Empleado.sectores))
        .where(Empleado.id == empleado_id)
    )
    if db_empleado is None:
        raise exceptions.EmpleadoNoEncontrado()

    if db_empleado.dni != empleado.dni:
        dni_existente = db.scalar(select(Empleado).where(Empleado.dni == empleado.dni))
        if dni_existente:
            raise exceptions.DniDuplicado()

    db_empleado.dni = empleado.dni
    db_empleado.nombre = empleado.nombre
    db_empleado.apellido = empleado.apellido
    db_empleado.activo = empleado.activo

    if empleado.listaCapacidades is not None:
        if empleado.listaCapacidades == []:
            db_empleado.capacidades = []
        else:
            capacidades = db.scalars(
                select(Capacidad).where(Capacidad.id.in_(empleado.listaCapacidades))
            ).all()
            
            if not capacidades or len(capacidades) != len(set(empleado.listaCapacidades)):
                raise CapacidadesExceptions.CapacidadNoEncontrada()
            
            db_empleado.capacidades = capacidades

    if empleado.listaSectores is not None:
        if empleado.listaSectores == []:
            db_empleado.sectores = []
        else:
            sectores = db.scalars(
                select(Sector).where(Sector.id.in_(empleado.listaSectores))
            ).all()
            db_empleado.sectores = sectores

    db.commit()
    db.refresh(db_empleado)
    return db_empleado

def eliminar_empleado(db: Session, empleado_id: int) -> schemas.Empleado:
    db_empleado = db.scalar(
        select(Empleado)
        .options(selectinload(Empleado.capacidades), selectinload(Empleado.sectores))
        .where(Empleado.id == empleado_id)
    )
    if db_empleado is None:
        raise exceptions.EmpleadoNoEncontrado()

    db_empleado.activo = False
    db.commit()
    db.refresh(db_empleado)
    
    return schemas.Empleado.model_validate(db_empleado)