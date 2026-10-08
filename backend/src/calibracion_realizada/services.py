import logging
from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.equipos.models import Equipo
from src.calibracion_realizada.models import CalibracionRealizada
from src.calibracion_realizada import schemas, exceptions

logger = logging.getLogger(__name__)

def buscar_equipo(db: Session, equipo_id: int) -> Optional[Equipo]:
    return db.scalar(
        select(Equipo)
        .where(Equipo.id == equipo_id)
    )

def listar_calibraciones_realizadas(db: Session) -> List[schemas.CalibracionRealizada]:
    return db.scalars(
        select(CalibracionRealizada)
        .options(selectinload(CalibracionRealizada.equipo))
    ).all()
    
def crear_calibracion_realizada(db: Session, calibracion: schemas.CalibracionRealizadaCreate) -> schemas.CalibracionRealizada:
    
    _calibracionrealizada = CalibracionRealizada(**calibracion.model_dump())

    if _calibracionrealizada.fecha is None:
        raise exceptions.FechaRequerida()
    if _calibracionrealizada.fecha > date.today():
        raise exceptions.FechaMayorAHoy()
    
    if _calibracionrealizada.equipo_id is None:
        raise exceptions.EquipoRequerido()
    EQUIPO_EXISTE = buscar_equipo(db, _calibracionrealizada.equipo_id)
    if EQUIPO_EXISTE is None:
        raise exceptions.EquipoNoEncontrado()
    
    if _calibracionrealizada.certificacion_url is None:
        raise exceptions.CertificacionRequerida()

    CALIBRACION_EXISTE = db.scalar(
            select(CalibracionRealizada)
            .where(CalibracionRealizada.equipo_id == calibracion.equipo_id, CalibracionRealizada.fecha == calibracion.fecha)
        )
    if CALIBRACION_EXISTE is not None:
        raise exceptions.CalibracionDuplicada()
    
    db.add(_calibracionrealizada)
    db.commit()
    db.refresh(_calibracionrealizada)
    return _calibracionrealizada

def obtener_calibraciones_de_equipo(db: Session, equipo_id: int) -> List[schemas.CalibracionRealizada]:
    EQUIPO_EXISTE = buscar_equipo(db, equipo_id)
    if EQUIPO_EXISTE is None:
        raise exceptions.EquipoNoEncontrado()
    
    return db.scalars(
        select(CalibracionRealizada)
        .where(CalibracionRealizada.equipo_id == equipo_id)
    ).all()