import logging
from typing import List

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from src.planes import services as planes_services
from src.productos_limpieza import services as productos_services
from src.tareas import exceptions, schemas
from src.tareas.models import ConsumoEstimado, Tarea

logger = logging.getLogger(__name__)


def _validar_titulo_unico_en_plan(
    db: Session, titulo: str, plan_id: int, tarea_id: int | None = None
) -> None:
    consulta = select(Tarea).where(Tarea.titulo == titulo).where(Tarea.plan_id == plan_id)
    if tarea_id is not None:
        consulta = consulta.where(Tarea.id != tarea_id)
    if db.scalar(consulta) is not None:
        raise exceptions.TituloDuplicadoEnPlan()


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
    planes_services.leer_plan(db, tarea.plan_id)
    _validar_titulo_unico_en_plan(db, tarea.titulo, tarea.plan_id)

    _tarea = Tarea(
        **tarea.model_dump(exclude={"consumos_estimados"}),
        consumos_estimados=_construir_consumos(db, tarea.consumos_estimados),
    )
    db.add(_tarea)
    db.commit()
    db.refresh(_tarea)
    return _tarea


def listar_tareas(db: Session, plan_id: int | None = None) -> List[schemas.Tarea]:
    logger.info("Listando tareas desde services")
    consulta = select(Tarea)
    if plan_id is not None:
        consulta = consulta.where(Tarea.plan_id == plan_id)
    return db.scalars(consulta).all()


def leer_tarea(db: Session, tarea_id: int) -> schemas.Tarea:
    db_tarea = db.scalar(select(Tarea).where(Tarea.id == tarea_id))
    if db_tarea is None:
        raise exceptions.TareaNoEncontrada()
    return db_tarea


def modificar_tarea(
    db: Session, tarea_id: int, tarea: schemas.TareaUpdate
) -> schemas.Tarea:
    db_tarea = leer_tarea(db, tarea_id)
    planes_services.leer_plan(db, tarea.plan_id)
    _validar_titulo_unico_en_plan(db, tarea.titulo, tarea.plan_id, tarea_id)

    nuevos_consumos = _construir_consumos(db, tarea.consumos_estimados)

    for campo, valor in tarea.model_dump(exclude={"consumos_estimados"}).items():
        setattr(db_tarea, campo, valor)

    db_tarea.consumos_estimados = nuevos_consumos

    db.commit()
    db.refresh(db_tarea)
    return db_tarea


def eliminar_tarea(db: Session, tarea_id: int) -> schemas.TareaDelete:
    leer_tarea(db, tarea_id)
    db.execute(delete(Tarea).where(Tarea.id == tarea_id))
    db.commit()
    return {"id": tarea_id, "msg": "borrado"}
