import logging
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.checklists.models import Checklist, ConsumoReal
from src.checklists import schemas, exceptions
from src.planes.models import Plan
from src.tareas.models import Tarea
from src.productos_limpieza.models import ProductoLimpieza
from src.empleados.models import Empleado, RolEmpleado
from src.sectores.models import Sector

logger = logging.getLogger(__name__)

def obtener_checklist_diario(db: Session, empleado: Optional[Empleado] = None) -> List[schemas.ChecklistItem]:
    query = select(Plan).options(selectinload(Plan.sector), selectinload(Plan.tareas))

    if empleado:
        user_sector_ids = [s.id for s in empleado.sectores] if empleado.sectores else []
        resp_sectors = db.scalars(select(Sector).where(Sector.responsable_id == empleado.id)).all()
        user_sector_ids.extend([s.id for s in resp_sectors])
        user_sector_ids = list(set(user_sector_ids))

        # Si el usuario tiene sectores asignados o a cargo, filtramos por sus sectores
        if user_sector_ids:
            query = query.where(Plan.sector_id.in_(user_sector_ids))

    planes = db.scalars(query).all()

    items = []
    vistos = set()

    for plan in planes:
        for tarea in plan.tareas:
            clave = (tarea.id, plan.id)
            if clave in vistos:
                continue
            vistos.add(clave)

            db_checklist = db.scalar(
                select(Checklist).where(
                    Checklist.tarea_id == tarea.id,
                    Checklist.plan_id == plan.id,
                    Checklist.fecha_programada == date.today(),
                    Checklist.realizada == True
                )
            )

            estado = "realizada" if db_checklist else "pendiente"

            frecuencia_str = tarea.frecuencia.value if hasattr(tarea.frecuencia, "value") else str(tarea.frecuencia)
            sector_nombre = plan.sector.nombre if plan.sector else ""

            items.append(
                schemas.ChecklistItem(
                    tarea_id=tarea.id,
                    titulo_tarea=tarea.titulo,
                    frecuencia=frecuencia_str,
                    plan_id=plan.id,
                    plan_titulo=plan.titulo,
                    sector_nombre=sector_nombre,
                    estado=estado
                )
            )

    return items


def marcar_tarea_completada(
    db: Session, tarea_id: int, payload: schemas.ChecklistMarcar
) -> schemas.RegistroChecklistDetalle:
    db_tarea = db.scalar(select(Tarea).where(Tarea.id == tarea_id))
    if db_tarea is None:
        raise exceptions.ChecklistNoEncontrado()

    query_check = select(Checklist).where(
        Checklist.tarea_id == tarea_id,
        Checklist.fecha_programada == date.today()
    )
    if payload.plan_id:
        query_check = query_check.where(Checklist.plan_id == payload.plan_id)

    db_checklist = db.scalar(query_check)

    if db_checklist is None:
        db_checklist = Checklist(
            tarea_id=tarea_id,
            plan_id=payload.plan_id,
            fecha_programada=date.today(),
            realizada=True,
            fecha_hora_completada=datetime.now(),
            empleado_id=payload.empleado_id,
            evidencia_url=payload.evidencia_url,
            observaciones=payload.observaciones
        )
        db.add(db_checklist)
        db.flush()
    else:
        db_checklist.plan_id = payload.plan_id
        db_checklist.realizada = True
        db_checklist.fecha_hora_completada = datetime.now()
        db_checklist.empleado_id = payload.empleado_id
        db_checklist.evidencia_url = payload.evidencia_url
        db_checklist.observaciones = payload.observaciones

    for consumo in payload.consumos:
        db_consumo = ConsumoReal(
            checklist_id=db_checklist.id,
            producto_limpieza_id=consumo.producto_limpieza_id,
            cantidad=consumo.cantidad
        )
        db.add(db_consumo)

        db_producto = db.scalar(
            select(ProductoLimpieza).where(ProductoLimpieza.id == consumo.producto_limpieza_id)
        )
        if db_producto:
            db_producto.stock = max(0.0, db_producto.stock - consumo.cantidad)

    db.commit()

    return obtener_detalle_tarea_realizada(db, tarea_id, payload.plan_id or 0)


def obtener_detalle_tarea_realizada(
    db: Session, tarea_id: int, plan_id: int
) -> schemas.RegistroChecklistDetalle:
    query = select(Checklist).options(
        selectinload(Checklist.tarea),
        selectinload(Checklist.plan).selectinload(Plan.sector),
        selectinload(Checklist.empleado),
        selectinload(Checklist.consumos_reales).selectinload(ConsumoReal.producto_limpieza)
    ).where(
        Checklist.tarea_id == tarea_id,
        Checklist.realizada == True
    )

    if plan_id:
        query = query.where(Checklist.plan_id == plan_id)

    db_checklist = db.scalar(query.where(Checklist.fecha_programada == date.today()))
    if db_checklist is None:
        db_checklist = db.scalar(query.order_by(Checklist.id.desc()))

    if db_checklist is None:
        raise exceptions.ChecklistNoEncontrado()

    nombre_emp = f"{db_checklist.empleado.nombre} {db_checklist.empleado.apellido} ({db_checklist.empleado.legajo})" if db_checklist.empleado else None
    titulo_tarea = db_checklist.tarea.titulo if db_checklist.tarea else ""
    plan_titulo = db_checklist.plan.titulo if db_checklist.plan else ""
    sector_nombre = db_checklist.plan.sector.nombre if db_checklist.plan and db_checklist.plan.sector else ""

    consumos_resumen = []
    for c in db_checklist.consumos_reales:
        nombre_prod = c.producto_limpieza.nombre if c.producto_limpieza else f"Producto #{c.producto_limpieza_id}"
        consumos_resumen.append(
            schemas.ConsumoRealResumen(
                id=c.id,
                producto_limpieza_id=c.producto_limpieza_id,
                nombre_producto=nombre_prod,
                cantidad=c.cantidad
            )
        )

    return schemas.RegistroChecklistDetalle(
        id=db_checklist.id,
        tarea_id=db_checklist.tarea_id,
        plan_id=db_checklist.plan_id,
        fecha_programada=db_checklist.fecha_programada,
        realizada=db_checklist.realizada,
        fecha_hora_completada=db_checklist.fecha_hora_completada,
        empleado_id=db_checklist.empleado_id,
        nombre_empleado=nombre_emp,
        titulo_tarea=titulo_tarea,
        plan_titulo=plan_titulo,
        sector_nombre=sector_nombre,
        evidencia_url=db_checklist.evidencia_url,
        observaciones=db_checklist.observaciones,
        consumos_reales=consumos_resumen
    )
