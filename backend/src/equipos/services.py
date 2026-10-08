import logging
from datetime import date, timedelta
from typing import List

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, selectinload

from src.equipos import schemas, exceptions
from src.equipos.constants import EstadoMantenimiento
from src.equipos.models import Equipo, TipoEquipo
from src.sectores.models import Sector

logger = logging.getLogger(__name__)

ESTADOS_QUE_ALERTAN = (EstadoMantenimiento.VENCIDO, EstadoMantenimiento.PROXIMO)


def crear_equipo(
    db: Session, equipo: schemas.EquipoCreate
) -> schemas.Equipo:
    tipo_existente = db.scalar(select(TipoEquipo).where(TipoEquipo.id == equipo.tipo_id))
    if not tipo_existente:
        raise exceptions.TipoEquipoNoEncontrado()
        
    sector_existente = db.scalar(select(Sector).where(Sector.id == equipo.sector_id))
    if not sector_existente:
        raise ValueError("El sector asignado no existe")
    
    fecha_proximo_mantenimiento = equipo.fecha_proximo_mantenimiento
    if fecha_proximo_mantenimiento is None:
        fecha_proximo_mantenimiento = date.today() + timedelta(
            days=equipo.frecuencia_mantenimiento_dias
        )

    if fecha_proximo_mantenimiento < date.today():
        raise exceptions.VencimientoInvalido()

    fecha_ultimo_mantenimiento = fecha_proximo_mantenimiento - timedelta(
        days=equipo.frecuencia_mantenimiento_dias
    )
    datos_equipo = equipo.model_dump(exclude={"fecha_proximo_mantenimiento"})
    datos_equipo["fecha_ultimo_mantenimiento"] = fecha_ultimo_mantenimiento
    _equipo = Equipo(**datos_equipo)
    db.add(_equipo)
    db.commit()
    db.refresh(_equipo)
    return _equipo

def listar_equipos(db: Session) -> List[schemas.Equipo]:
    logger.info("Listando equipos desde services")
    return db.scalars(
        select(Equipo).options(selectinload(Equipo.tipo), selectinload(Equipo.sector))
    ).all()

def leer_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = db.scalar(
        select(Equipo)
        .options(selectinload(Equipo.tipo), selectinload(Equipo.sector))
        .where(Equipo.id == equipo_id)
    )
    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()
    return db_equipo

def modificar_equipo(
    db: Session, equipo_id: int, equipo: schemas.EquipoUpdate
) -> Equipo:
    db_equipo = leer_equipo(db, equipo_id)

    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()

    tipo_existente = db.scalar(select(TipoEquipo).where(TipoEquipo.id == equipo.tipo_id))
    if not tipo_existente:
        raise exceptions.TipoEquipoNoEncontrado()
        
    sector_existente = db.scalar(select(Sector).where(Sector.id == equipo.sector_id))
    if not sector_existente:
        raise ValueError("El sector asignado no existe")

    datos = equipo.model_dump()
    if datos.get("fecha_proximo_mantenimiento") is None:
        datos.pop("fecha_proximo_mantenimiento", None)

    db.execute(
        update(Equipo)
        .where(Equipo.id == equipo_id)
        .values(**datos)
    )
        
    db.commit()
    db.refresh(db_equipo)
    return db_equipo

from fastapi import HTTPException
from src.planes.models import Plan

def obtener_impacto_equipo(db: Session, equipo_id: int) -> List[str]:
    planes = db.scalars(select(Plan).where(Plan.equipos.any(id=equipo_id))).all()
    return [p.titulo for p in planes]

def eliminar_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = db.scalar(
        select(Equipo)
        .options(selectinload(Equipo.tipo), selectinload(Equipo.sector))
        .where(Equipo.id == equipo_id)
    )
    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()

    if db_equipo.activo:
        raise HTTPException(
            status_code=400,
            detail="Los equipos activos no se pueden eliminar físicamente. Primero debe darlo de baja lógica."
        )

    planes = db.scalars(select(Plan).where(Plan.equipos.any(id=equipo_id))).all()
    if planes:
        titulos = ", ".join(p.titulo for p in planes)
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar físicamente este equipo porque está vinculado a los siguientes planes: {titulos}."
        )

    respuesta = schemas.Equipo.model_validate(db_equipo)
    db.execute(delete(Equipo).where(Equipo.id == equipo_id))
    db.commit()
    return respuesta