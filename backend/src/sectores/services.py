import logging
from typing import List
<<<<<<< HEAD

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.empleados import services as empleados_services
from src.sectores import exceptions, schemas
from src.sectores.models import Sector

logger = logging.getLogger(__name__)


def crear_sector(db: Session, sector: schemas.SectorCreate) -> schemas.Sector:
    empleados_services.leer_empleado(db, sector.encargado_id)

    duplicado = db.scalar(select(Sector).where(Sector.titulo == sector.titulo))
    if duplicado is not None:
        raise exceptions.TituloDuplicado()

    _sector = Sector(**sector.model_dump())
    db.add(_sector)
    db.commit()
    db.refresh(_sector)
    return _sector


def listar_sectores(db: Session) -> List[schemas.Sector]:
    logger.info("Listando sectores desde services")
    return db.scalars(select(Sector)).all()


def leer_sector(db: Session, sector_id: int) -> schemas.Sector:
    db_sector = db.scalar(select(Sector).where(Sector.id == sector_id))
=======
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
>>>>>>> origin/planes-rama
    if db_sector is None:
        raise exceptions.SectorNoEncontrado()
    return db_sector

<<<<<<< HEAD

def modificar_sector(
    db: Session, sector_id: int, sector: schemas.SectorUpdate
) -> schemas.Sector:
    db_sector = leer_sector(db, sector_id)
    empleados_services.leer_empleado(db, sector.encargado_id)

    duplicado = db.scalar(
        select(Sector)
        .where(Sector.titulo == sector.titulo)
        .where(Sector.id != sector_id)
    )
    if duplicado is not None:
        raise exceptions.TituloDuplicado()

    db.execute(
        update(Sector).where(Sector.id == sector_id).values(**sector.model_dump())
    )
=======
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

>>>>>>> origin/planes-rama
    db.commit()
    db.refresh(db_sector)
    return db_sector

<<<<<<< HEAD

def eliminar_sector(db: Session, sector_id: int) -> schemas.SectorDelete:
    leer_sector(db, sector_id)
    try:
        db.execute(delete(Sector).where(Sector.id == sector_id))
=======
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
>>>>>>> origin/planes-rama
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.SectorEnUso()
<<<<<<< HEAD
    return {"id": sector_id, "msg": "borrado"}
=======
        
    return db_sector
>>>>>>> origin/planes-rama
