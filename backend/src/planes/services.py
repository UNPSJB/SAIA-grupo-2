import logging
from datetime import date
from typing import List

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.equipos import services as equipos_services
from src.tareas import services as tareas_services
from src.equipos.constants import EstadoEquipo
from src.planes import exceptions, schemas
from src.planes.models import Plan
from src.sectores import services as sectores_services

logger = logging.getLogger(__name__)


def _validar_titulo_unico(db: Session, titulo: str, plan_id: int | None = None) -> None:
    consulta = select(Plan).where(Plan.titulo == titulo)
    if plan_id is not None:
        consulta = consulta.where(Plan.id != plan_id)
    if db.scalar(consulta) is not None:
        raise exceptions.TituloDuplicado()


def _resolver_equipos(db: Session, equipos_ids: List[int]):
    if not equipos_ids:
        raise exceptions.SinEquipos()

    equipos = []
    for equipo_id in dict.fromkeys(equipos_ids):
        db_equipo = equipos_services.leer_equipo(db, equipo_id)
        if db_equipo.estado == EstadoEquipo.DANADO:
            raise exceptions.EquipoDanado()
        equipos.append(db_equipo)
    return equipos

def _resolver_tareas(db: Session, tareas_ids: List[int]):
    tareas = []
    for tarea_id in dict.fromkeys(tareas_ids):
        db_tarea = tareas_services.leer_tarea(db, tarea_id)
        tareas.append(db_tarea)
    return tareas

def crear_plan(db: Session, plan: schemas.PlanCreate) -> schemas.Plan:
    sectores_services.leer_sector(db, plan.sector_id)
    _validar_titulo_unico(db, plan.titulo)

    equipos = _resolver_equipos(db, plan.equipos_ids)
    tareas = _resolver_tareas(db, plan.tareas_ids)

    datos = plan.model_dump(exclude={"equipos_ids", "tareas_ids"})
    _plan = Plan(**datos, equipos=equipos, tareas=tareas)
    db.add(_plan)

    db.commit()
    db.refresh(_plan)
    return _plan


def listar_planes(db: Session) -> List[schemas.Plan]:
    logger.info("Listando planes desde services")
    return db.scalars(select(Plan)).all()


def leer_plan(db: Session, plan_id: int) -> schemas.Plan:
    db_plan = db.scalar(select(Plan).where(Plan.id == plan_id))
    if db_plan is None:
        raise exceptions.PlanNoEncontrado()
    return db_plan


def modificar_plan(
    db: Session, plan_id: int, plan: schemas.PlanUpdate
) -> schemas.Plan:
    db_plan = leer_plan(db, plan_id)
    sectores_services.leer_sector(db, plan.sector_id)
    _validar_titulo_unico(db, plan.titulo, plan_id)

    db_plan.equipos = _resolver_equipos(db, plan.equipos_ids)
    db_plan.tareas = _resolver_tareas(db, plan.tareas_ids)
    for campo, valor in plan.model_dump(
        exclude={"equipos_ids", "tareas_ids"}
    ).items():
        setattr(db_plan, campo, valor)

    db.commit()
    db.refresh(db_plan)
    return db_plan


def eliminar_plan(db: Session, plan_id: int) -> schemas.PlanDelete:
    db_plan = leer_plan(db, plan_id)
        
    try:
        db_plan.equipos.clear()
        db_plan.tareas.clear()
        
        db.execute(delete(Plan).where(Plan.id == plan_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.PlanConTareas()
        
    return schemas.PlanDelete(id=plan_id, msg="borrado")