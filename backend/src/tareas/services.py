import logging
from datetime import datetime
from typing import List

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from src.planes import services as planes_services
from src.productos_limpieza import services as productos_services
from src.tareas import exceptions, schemas
from src.tareas.models import ConsumoEstimado, Tarea

logger = logging.getLogger(__name__)


def _resolver_planes(db, planes_ids: List[int]):
    if not planes_ids:
        raise exceptions.SinPlanes()

    planes = []
    for plan_id in dict.fromkeys(planes_ids):
        db_plan = planes_services.leer_plan(db, plan_id)
        planes.append(db_plan)
    return planes

def _construir_consumos(
    db: Session, consumos: List[schemas.ConsumoEstimadoCreate]
) -> List[ConsumoEstimado]:
    vistos = set()
    filas = []
    for consumo in consumos:
        if consumo.producto_limpieza_id in vistos:
            raise exceptions.ProductoRepetido()
        vistos.add(consumo.producto_limpieza_id)

        db_producto = productos_services.leer_producto(db, consumo.producto_limpieza_id)
        if db_producto.stock <= 0:
            raise exceptions.SinStock()

        filas.append(
            ConsumoEstimado(
                producto_limpieza_id=consumo.producto_limpieza_id,
                cantidad=consumo.cantidad,
            )
        )
    return filas


def crear_tarea(db: Session, tarea: schemas.TareaCreate) -> schemas.Tarea:
    if not tarea.planes:
        raise exceptions.SinPlanes()
    planes_services.leer_plan(db, tarea.planes[0])  # Verifico que el plan exista
    _tarea = Tarea(
        **tarea.model_dump(exclude={"consumos_estimados", "planes"}),
        consumos_estimados=_construir_consumos(db, tarea.consumos_estimados),
        planes=_resolver_planes(db, tarea.planes),
    )
    db.add(_tarea)
    db.commit()
    db.refresh(_tarea)
    return _tarea


def listar_tareas(db: Session, plan_id: int | None = None) -> List[schemas.Tarea]:
    logger.info("Listando tareas desde services")
    consulta = select(Tarea)
    if plan_id is not None:
        consulta = consulta.join(Tarea.planes).where(planes_services.Plan.id == plan_id)
    return list(db.scalars(consulta).all())


def leer_tarea(db: Session, tarea_id: int) -> schemas.Tarea:
    db_tarea = db.scalar(select(Tarea).where(Tarea.id == tarea_id))
    if db_tarea is None:
        raise exceptions.TareaNoEncontrada()
    return db_tarea


def modificar_tarea(
    db: Session, tarea_id: int, tarea: schemas.TareaUpdate
) -> schemas.Tarea:
    db_tarea = leer_tarea(db, tarea_id)

    if db_tarea.completada:
        raise exceptions.TareaYaCompletada()

    nuevos_consumos = _construir_consumos(db, tarea.consumos_estimados)
    db_tarea.planes = _resolver_planes(db, tarea.planes)
    for campo, valor in tarea.model_dump(
        exclude={"consumos_estimados", "planes"}
        ).items():
        setattr(db_tarea, campo, valor)

    db_tarea.consumos_estimados = nuevos_consumos

    db.commit()
    db.refresh(db_tarea)
    return db_tarea


def eliminar_tarea(db: Session, tarea_id: int) -> schemas.TareaDelete:
    leer_tarea(db, tarea_id)
    db.execute(delete(Tarea).where(Tarea.id == tarea_id))
    db.commit()
    return schemas.TareaDelete(id=tarea_id, msg="borrado")


def completar_tarea(db: Session, tarea_id: int, empleado_id: int) -> schemas.Tarea:
    db_tarea = leer_tarea(db, tarea_id)

    #Control para asegurar la inmutabilidad de los registros historicos
    if db_tarea.completada:
        raise exceptions.TareaYaCompletada()

    db_tarea.completada = True
    db_tarea.completada_por_id = empleado_id
    db_tarea.fecha_finalizacion = datetime.now()

    db.commit()
    db.refresh(db_tarea)
    return db_tarea