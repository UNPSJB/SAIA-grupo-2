import logging
from typing import List
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from src.sectores.models import Sector
from src.sectores import schemas, exceptions
from src.empleados.models import Empleado

logger = logging.getLogger(__name__)

def crear_sector(db: Session, sector: schemas.SectorCreate) -> Sector:
    sector_existente = db.scalar(select(Sector).where(Sector.nombre.ilike(sector.nombre)))
    if sector_existente:
        raise exceptions.NombreDuplicado()

    empleados = []
    if sector.listaEmpleados:
        empleados = db.scalars(select(Empleado).where(Empleado.id.in_(sector.listaEmpleados))).all()

    nuevo_sector = Sector(
        nombre=sector.nombre,
        responsable_id=sector.responsable_id,
        empleados=empleados
    )
    db.add(nuevo_sector)
    db.commit()
    db.refresh(nuevo_sector)
    return nuevo_sector

def listar_sectores(db: Session) -> List[Sector]:
    logger.info("Listando sectores desde services")
    return db.scalars(
        select(Sector)
        .options(selectinload(Sector.empleados), selectinload(Sector.responsable), selectinload(Sector.equipos))
    ).all()

def leer_sector(db: Session, sector_id: int) -> Sector:
    db_sector = db.scalar(
        select(Sector)
        .options(selectinload(Sector.empleados), selectinload(Sector.responsable), selectinload(Sector.equipos)) 
        .where(Sector.id == sector_id)
    )
    if db_sector is None:
        raise exceptions.SectorNoEncontrado()
    return db_sector

def modificar_sector(db: Session, sector_id: int, sector: schemas.SectorUpdate) -> Sector:
    db_sector = db.scalar(
        select(Sector)
        .options(selectinload(Sector.empleados), selectinload(Sector.responsable), selectinload(Sector.equipos)) 
        .where(Sector.id == sector_id)
    )
    if db_sector is None:
        raise exceptions.SectorNoEncontrado()

    if db_sector.nombre.lower() != sector.nombre.lower():
        nombre_existente = db.scalar(select(Sector).where(Sector.nombre.ilike(sector.nombre)))
        if nombre_existente:
            raise exceptions.NombreDuplicado()

    db_sector.nombre = sector.nombre
    db_sector.responsable_id = sector.responsable_id

    if sector.listaEmpleados is not None:
        if sector.listaEmpleados == []:
            db_sector.empleados = []
        else:
            empleados = db.scalars(select(Empleado).where(Empleado.id.in_(sector.listaEmpleados))).all()
            db_sector.empleados = empleados

    db.commit()
    db.refresh(db_sector)
    return db_sector

def eliminar_sector(db: Session, sector_id: int) -> Sector:
    db_sector = db.scalar(
        select(Sector)
        .options(selectinload(Sector.empleados), selectinload(Sector.responsable), selectinload(Sector.equipos))
        .where(Sector.id == sector_id)
    )
    if db_sector is None:
        raise exceptions.SectorNoEncontrado()

    try:
        db.delete(db_sector)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.SectorEnUso()
        
    return db_sector