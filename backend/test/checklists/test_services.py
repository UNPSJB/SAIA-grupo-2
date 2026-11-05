from datetime import date, datetime, time, timedelta

import pytest
from sqlalchemy.orm import Session

from src.checklists import exceptions, services
from src.checklists.constants import GranularidadCumplimiento
from src.checklists.models import Checklist
from src.empleados.models import Empleado, RolEmpleado
from src.planes.models import Plan
from src.sectores.models import Sector
from src.tareas.constants import FrecuenciaTarea
from src.tareas.models import Tarea

LUNES = date(2026, 6, 1)


def _crear_plan(
    db: Session,
    fecha_inicio: date = LUNES,
    cantidad_tareas: int = 2,
    fecha_fin: date | None = None,
    nombre_sector: str = "sector test",
) -> Plan:
    """Crea un sector con un plan y sus tareas diarias, listo para generar el historial."""
    sector = Sector(nombre=nombre_sector)
    tareas = [
        Tarea(titulo=f"tarea {indice}", frecuencia=FrecuenciaTarea.DIARIA)
        for indice in range(cantidad_tareas)
    ]
    plan = Plan(
        titulo=f"plan {nombre_sector}",
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        sector=sector,
        tareas=tareas,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def _crear_empleado(db: Session) -> Empleado:
    empleado = Empleado(
        legajo="EMP-9000",
        dni="40000000",
        nombre="empleado",
        apellido="test",
        activo=True,
        rol=RolEmpleado.OPERARIO,
    )
    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


def _marcar(db: Session, plan: Plan, tarea: Tarea, fecha: date, empleado: Empleado, realizada: bool = True) -> None:
    """Registra la ejecucion de una tarea del plan en un dia puntual."""
    db.add(
        Checklist(
            tarea_id=tarea.id,
            plan_id=plan.id,
            fecha_programada=fecha,
            realizada=realizada,
            fecha_hora_completada=datetime.combine(fecha, time(10, 0)) if realizada else None,
            empleado_id=empleado.id,
        )
    )
    db.commit()


def test_cumplimiento_por_dia_calcula_porcentaje_de_cada_dia(db_session: Session):
    plan = _crear_plan(db_session)
    empleado = _crear_empleado(db_session)
    _marcar(db_session, plan, plan.tareas[0], LUNES, empleado)
    _marcar(db_session, plan, plan.tareas[1], LUNES, empleado)
    _marcar(db_session, plan, plan.tareas[0], LUNES + timedelta(days=1), empleado)

    resultado = services.obtener_grafico_cumplimiento(
        db_session, LUNES, LUNES + timedelta(days=2), GranularidadCumplimiento.DIA
    )

    assert [item.periodo for item in resultado.serie] == [LUNES + timedelta(days=dias) for dias in range(3)]
    assert [(item.esperadas, item.realizadas) for item in resultado.serie] == [(2, 2), (2, 1), (2, 0)]
    assert [item.porcentaje for item in resultado.serie] == [100.0, 50.0, 0.0]


def test_cumplimiento_devuelve_un_punto_por_dia_aunque_no_haya_registros(db_session: Session):
    _crear_plan(db_session)

    resultado = services.obtener_grafico_cumplimiento(
        db_session, LUNES, LUNES + timedelta(days=6), GranularidadCumplimiento.DIA
    )

    assert len(resultado.serie) == 7
    assert all(item.porcentaje == 0.0 for item in resultado.serie)


def test_cumplimiento_dia_sin_tareas_programadas_no_es_cero(db_session: Session):
    _crear_plan(db_session, fecha_inicio=LUNES + timedelta(days=2))

    resultado = services.obtener_grafico_cumplimiento(
        db_session, LUNES, LUNES + timedelta(days=3), GranularidadCumplimiento.DIA
    )

    assert [item.porcentaje for item in resultado.serie[:2]] == [None, None]
    assert [item.esperadas for item in resultado.serie[:2]] == [0, 0]
    assert resultado.serie[2].esperadas == 2


def test_cumplimiento_respeta_la_fecha_de_fin_del_plan(db_session: Session):
    _crear_plan(db_session, fecha_fin=LUNES + timedelta(days=1))

    resultado = services.obtener_grafico_cumplimiento(
        db_session, LUNES, LUNES + timedelta(days=3), GranularidadCumplimiento.DIA
    )

    assert [item.esperadas for item in resultado.serie] == [2, 2, 0, 0]


def test_cumplimiento_no_cuenta_registros_no_realizados(db_session: Session):
    plan = _crear_plan(db_session, cantidad_tareas=1)
    empleado = _crear_empleado(db_session)
    _marcar(db_session, plan, plan.tareas[0], LUNES, empleado, realizada=False)

    resultado = services.obtener_grafico_cumplimiento(db_session, LUNES, LUNES, GranularidadCumplimiento.DIA)

    assert resultado.serie[0].realizadas == 0
    assert resultado.serie[0].porcentaje == 0.0


def test_cumplimiento_suma_los_planes_de_todos_los_sectores(db_session: Session):
    plan_a = _crear_plan(db_session, cantidad_tareas=1, nombre_sector="sector a")
    _crear_plan(db_session, cantidad_tareas=3, nombre_sector="sector b")
    empleado = _crear_empleado(db_session)
    _marcar(db_session, plan_a, plan_a.tareas[0], LUNES, empleado)

    resultado = services.obtener_grafico_cumplimiento(db_session, LUNES, LUNES, GranularidadCumplimiento.DIA)

    assert (resultado.serie[0].esperadas, resultado.serie[0].realizadas) == (4, 1)
    assert resultado.serie[0].porcentaje == 25.0


def test_cumplimiento_por_semana_agrupa_por_lunes(db_session: Session):
    plan = _crear_plan(db_session, cantidad_tareas=1)
    empleado = _crear_empleado(db_session)
    for dias in range(7):
        _marcar(db_session, plan, plan.tareas[0], LUNES + timedelta(days=dias), empleado)
    _marcar(db_session, plan, plan.tareas[0], LUNES + timedelta(days=7), empleado)

    resultado = services.obtener_grafico_cumplimiento(
        db_session, LUNES, LUNES + timedelta(days=13), GranularidadCumplimiento.SEMANA
    )

    assert [item.periodo for item in resultado.serie] == [LUNES, LUNES + timedelta(days=7)]
    assert [(item.esperadas, item.realizadas) for item in resultado.serie] == [(7, 7), (7, 1)]
    assert [item.porcentaje for item in resultado.serie] == [100.0, 14.3]


def test_cumplimiento_por_semana_con_rango_que_empieza_a_mitad_de_semana(db_session: Session):
    _crear_plan(db_session, cantidad_tareas=1)
    miercoles = LUNES + timedelta(days=2)

    resultado = services.obtener_grafico_cumplimiento(
        db_session, miercoles, miercoles + timedelta(days=7), GranularidadCumplimiento.SEMANA
    )

    assert [item.periodo for item in resultado.serie] == [LUNES, LUNES + timedelta(days=7)]
    assert [item.esperadas for item in resultado.serie] == [5, 3]


def test_cumplimiento_devuelve_el_rango_y_la_granularidad_pedidos(db_session: Session):
    resultado = services.obtener_grafico_cumplimiento(
        db_session, LUNES, LUNES + timedelta(days=1), GranularidadCumplimiento.SEMANA
    )

    assert resultado.fecha_desde == LUNES
    assert resultado.fecha_hasta == LUNES + timedelta(days=1)
    assert resultado.granularidad == GranularidadCumplimiento.SEMANA


def test_cumplimiento_sin_planes_no_tiene_porcentajes(db_session: Session):
    resultado = services.obtener_grafico_cumplimiento(
        db_session, LUNES, LUNES + timedelta(days=2), GranularidadCumplimiento.DIA
    )

    assert len(resultado.serie) == 3
    assert all(item.porcentaje is None for item in resultado.serie)


def test_cumplimiento_rango_invalido(db_session: Session):
    with pytest.raises(exceptions.RangoFechasInvalido):
        services.obtener_grafico_cumplimiento(db_session, LUNES + timedelta(days=1), LUNES)
