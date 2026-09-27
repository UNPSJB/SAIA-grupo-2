import logging
from typing import List

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
    if db_sector is None:
        raise exceptions.SectorNoEncontrado()
    return db_sector


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
    db.commit()
    db.refresh(db_sector)
    return db_sector


def eliminar_sector(db: Session, sector_id: int) -> schemas.SectorDelete:
    leer_sector(db, sector_id)
    try:
        db.execute(delete(Sector).where(Sector.id == sector_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.SectorEnUso()
    return {"id": sector_id, "msg": "borrado"}
