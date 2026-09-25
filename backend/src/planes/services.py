import logging
from datetime import date
from typing import List

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.empleados import services as empleados_services
from src.equipos import services as equipos_services
from src.planes import exceptions, schemas
from src.planes.models import AsignacionPlan, Plan
from src.sectores import services as sectores_services

logger = logging.getLogger(__name__)


def _validar_titulo_unico(db: Session, titulo: str, plan_id: int | None = None) -> None:
    consulta = select(Plan).where(Plan.titulo == titulo)
    if plan_id is not None:
        consulta = consulta.where(Plan.id != plan_id)
    if db.scalar(consulta) is not None:
        raise exceptions.TituloDuplicado()


def _resolver_equipos(db: Session, equipos_ids: List[int]):
    equipos = []
    for equipo_id in dict.fromkeys(equipos_ids):
        equipos.append(equipos_services.leer_equipo(db, equipo_id))
    return equipos


def _asignar_responsable(db: Session, db_plan: Plan, empleado_id: int) -> None:
    empleados_services.leer_empleado(db, empleado_id)

    vigente = next((a for a in db_plan.asignaciones if a.fecha_fin is None), None)
    if vigente is not None:
        if vigente.empleado_id == empleado_id:
            return
        vigente.fecha_fin = date.today()

    db_plan.asignaciones.append(
        AsignacionPlan(empleado_id=empleado_id, fecha_asignacion=date.today())
    )


def crear_plan(db: Session, plan: schemas.PlanCreate) -> schemas.Plan:
    sectores_services.leer_sector(db, plan.sector_id)
    _validar_titulo_unico(db, plan.titulo)

    equipos = _resolver_equipos(db, plan.equipos_ids)

    datos = plan.model_dump(exclude={"equipos_ids", "responsable_id"})
    _plan = Plan(**datos, equipos=equipos)
    db.add(_plan)
    _asignar_responsable(db, _plan, plan.responsable_id)

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

    for campo, valor in plan.model_dump(
        exclude={"equipos_ids", "responsable_id"}
    ).items():
        setattr(db_plan, campo, valor)

    _asignar_responsable(db, db_plan, plan.responsable_id)

    db.commit()
    db.refresh(db_plan)
    return db_plan


def eliminar_plan(db: Session, plan_id: int) -> schemas.PlanDelete:
    db_plan = leer_plan(db, plan_id)
    if db_plan.tareas:
        raise exceptions.PlanConTareas()
    try:
        db.execute(delete(Plan).where(Plan.id == plan_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.PlanConTareas()
    return {"id": plan_id, "msg": "borrado"}
