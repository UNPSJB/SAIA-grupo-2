import logging
from datetime import date, datetime, timedelta
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

        for consumo_previo in list(db_checklist.consumos_reales):
            db_producto = db.scalar(
                select(ProductoLimpieza).where(ProductoLimpieza.id == consumo_previo.producto_limpieza_id)
            )
            if db_producto:
                db_producto.stock += consumo_previo.cantidad
            db.delete(consumo_previo)
    db.flush()

    for consumo in payload.consumos:
        db_producto = db.scalar(
            select(ProductoLimpieza).where(ProductoLimpieza.id == consumo.producto_limpieza_id)
        )
        if db_producto is None:
            db.rollback()
            raise exceptions.ProductoNoEncontrado()

        if db_producto.stock < consumo.cantidad:
            db.rollback()
            raise exceptions.StockInsuficiente()

        db_producto.stock -= consumo.cantidad

        db.add(ConsumoReal(
            checklist_id=db_checklist.id,
            producto_limpieza_id=consumo.producto_limpieza_id,
            cantidad=consumo.cantidad
        ))

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


def obtener_historial_checklists(
    db: Session,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    sector_id: Optional[int] = None
) -> schemas.HistorialChecklistResumen:
    hoy = date.today()
    if not fecha_fin:
        fecha_fin = hoy
    if not fecha_inicio:
        fecha_inicio = fecha_fin - timedelta(days=7)

    if fecha_inicio > fecha_fin:
        fecha_inicio, fecha_fin = fecha_fin, fecha_inicio

    query_planes = select(Plan).options(selectinload(Plan.sector), selectinload(Plan.tareas))
    if sector_id:
        query_planes = query_planes.where(Plan.sector_id == sector_id)

    planes = db.scalars(query_planes).all()

    query_checklists = select(Checklist).options(
        selectinload(Checklist.tarea),
        selectinload(Checklist.plan).selectinload(Plan.sector),
        selectinload(Checklist.empleado)
    ).where(
        Checklist.fecha_programada >= fecha_inicio,
        Checklist.fecha_programada <= fecha_fin,
        Checklist.realizada == True
    )
    if sector_id:
        query_checklists = query_checklists.join(Checklist.plan).where(Plan.sector_id == sector_id)

    checklists_ejecutados = db.scalars(query_checklists).all()

    ejecutados_map = {
        (c.tarea_id, c.plan_id, c.fecha_programada): c
        for c in checklists_ejecutados
    }

    registros = []
    incumplidas_map = {}

    curr_date = fecha_fin
    while curr_date >= fecha_inicio:
        for plan in planes:
            if plan.fecha_inicio > curr_date:
                continue
            if plan.fecha_fin and plan.fecha_fin < curr_date:
                continue

            sector_nombre = plan.sector.nombre if plan.sector else ""

            for tarea in plan.tareas:
                clave_e = (tarea.id, plan.id, curr_date)
                c_ejecutado = ejecutados_map.get(clave_e)

                frecuencia_str = tarea.frecuencia.value if hasattr(tarea.frecuencia, "value") else str(tarea.frecuencia)

                if c_ejecutado:
                    nombre_emp = f"{c_ejecutado.empleado.nombre} {c_ejecutado.empleado.apellido} ({c_ejecutado.empleado.legajo})" if c_ejecutado.empleado else None
                    registros.append(
                        schemas.RegistroHistorialItem(
                            id=c_ejecutado.id,
                            tarea_id=tarea.id,
                            titulo_tarea=tarea.titulo,
                            plan_id=plan.id,
                            plan_titulo=plan.titulo,
                            sector_nombre=sector_nombre,
                            frecuencia=frecuencia_str,
                            fecha_programada=curr_date,
                            realizada=True,
                            fecha_hora_completada=c_ejecutado.fecha_hora_completada,
                            empleado_id=c_ejecutado.empleado_id,
                            nombre_empleado=nombre_emp,
                            evidencia_url=c_ejecutado.evidencia_url,
                            observaciones=c_ejecutado.observaciones
                        )
                    )
                else:
                    registros.append(
                        schemas.RegistroHistorialItem(
                            id=None,
                            tarea_id=tarea.id,
                            titulo_tarea=tarea.titulo,
                            plan_id=plan.id,
                            plan_titulo=plan.titulo,
                            sector_nombre=sector_nombre,
                            frecuencia=frecuencia_str,
                            fecha_programada=curr_date,
                            realizada=False,
                            fecha_hora_completada=None,
                            empleado_id=None,
                            nombre_empleado=None,
                            evidencia_url=None,
                            observaciones=None
                        )
                    )

                    key_incumplida = (tarea.id, plan.id)
                    if key_incumplida not in incumplidas_map:
                        incumplidas_map[key_incumplida] = {
                            "tarea_id": tarea.id,
                            "titulo_tarea": tarea.titulo,
                            "plan_titulo": plan.titulo,
                            "sector_nombre": sector_nombre,
                            "frecuencia": frecuencia_str,
                            "veces_incumplida": 0
                        }
                    incumplidas_map[key_incumplida]["veces_incumplida"] += 1

        curr_date -= timedelta(days=1)

    total_esperadas = len(registros)
    total_realizadas = sum(1 for r in registros if r.realizada)
    total_incumplidas = total_esperadas - total_realizadas

    porcentaje = round((total_realizadas / total_esperadas * 100), 1) if total_esperadas > 0 else 100.0

    tareas_incumplidas_list = sorted(
        [schemas.TareaIncumplidaResumen(**info) for info in incumplidas_map.values()],
        key=lambda x: x.veces_incumplida,
        reverse=True
    )

    return schemas.HistorialChecklistResumen(
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        porcentaje_cumplimiento=porcentaje,
        total_esperadas=total_esperadas,
        total_realizadas=total_realizadas,
        total_incumplidas=total_incumplidas,
        tareas_incumplidas_resumen=tareas_incumplidas_list,
        registros=registros
    )
