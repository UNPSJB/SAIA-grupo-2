import pytest

from datetime import date, timedelta

from fastapi import HTTPException
from pydantic import ValidationError

from src.equipos.constants import EstadoEquipo
from src.equipos.models import Equipo, TipoEquipo
from src.planes import exceptions, schemas, services
from src.sectores.models import Sector
from src.tareas.constants import FrecuenciaTarea
from src.tareas.models import Tarea

from src.sectores import exceptions as sectores_exceptions
from src.equipos import exceptions as equipos_exceptions
from src.tareas import exceptions as tareas_exceptions

def crear_datos_base(
    db_session,
    equipo_estado=EstadoEquipo.BUENO,
    equipo_activo=True,
    tarea_activa=True,
):
    """Crea los registros necesarios para probar un plan."""

    sector = Sector(nombre="Sector de prueba")
    tipo_equipo = TipoEquipo(nombre="Heladera")

    db_session.add_all([sector, tipo_equipo])
    db_session.flush()

    equipo = Equipo(
        nombre="Heladera de prueba",
        sector_id=sector.id,
        tipo_id=tipo_equipo.id,
        estado=equipo_estado,
        activo=equipo_activo,
    )

    tarea = Tarea(
        titulo="Limpiar heladera",
        frecuencia=FrecuenciaTarea.DIARIA,
        activo=tarea_activa,
    )

    db_session.add_all([equipo, tarea])
    db_session.flush()

    return sector, equipo, tarea


def crear_plan_schema(sector, equipo, tarea, titulo="Plan de prueba"):
    """Construye los datos de entrada que recibe crear_plan()."""

    return schemas.PlanCreate(
        titulo=titulo,
        fecha_inicio=date(2026, 1, 1),
        fecha_fin=date(2026, 12, 31),
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[tarea.id],
    )


def test_crear_plan_correctamente(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    datos = crear_plan_schema(sector, equipo, tarea)

    plan = services.crear_plan(db_session, datos)

    assert plan.id is not None
    assert plan.titulo == "Plan de prueba"
    assert plan.sector_id == sector.id
    assert len(plan.equipos) == 1
    assert len(plan.tareas) == 1


def test_listar_planes_sin_registros(db_session):
    resultado = services.listar_planes(db_session)

    assert resultado == []


def test_listar_planes_con_registro(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    datos = crear_plan_schema(sector, equipo, tarea)

    services.crear_plan(db_session, datos)

    resultado = services.listar_planes(db_session)

    assert len(resultado) == 1
    assert resultado[0].titulo == "Plan de prueba"


def test_leer_plan_existente(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    datos = crear_plan_schema(sector, equipo, tarea)

    plan_creado = services.crear_plan(db_session, datos)
    resultado = services.leer_plan(db_session, plan_creado.id)

    assert resultado.id == plan_creado.id
    assert resultado.titulo == plan_creado.titulo


def test_leer_plan_inexistente(db_session):
    with pytest.raises(exceptions.PlanNoEncontrado):
        services.leer_plan(db_session, 9999)


def test_no_permite_titulos_duplicados(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)

    datos = crear_plan_schema(sector, equipo, tarea)
    services.crear_plan(db_session, datos)

    datos_duplicados = crear_plan_schema(
        sector, equipo, tarea, titulo="Plan de prueba"
    )

    with pytest.raises(exceptions.TituloDuplicado):
        services.crear_plan(db_session, datos_duplicados)


def test_no_permite_crear_plan_sin_equipos(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)

    datos = crear_plan_schema(sector, equipo, tarea)
    datos.equipos_ids = []

    with pytest.raises(exceptions.SinEquipos):
        services.crear_plan(db_session, datos)


def test_no_permite_equipo_danado(db_session):
    sector, equipo, tarea = crear_datos_base(
        db_session,
        equipo_estado=EstadoEquipo.DANADO,
    )
    datos = crear_plan_schema(sector, equipo, tarea)

    with pytest.raises(exceptions.EquipoDanado):
        services.crear_plan(db_session, datos)


def test_no_permite_equipo_inactivo(db_session):

    sector, equipo, tarea = crear_datos_base(
        db_session,
        equipo_activo=False,
    )
    datos = crear_plan_schema(sector, equipo, tarea)

    with pytest.raises(HTTPException) as error:
        services.crear_plan(db_session, datos)

    assert error.value.status_code == 400


def test_no_permite_tarea_inactiva(db_session):

    sector, equipo, tarea = crear_datos_base(
        db_session,
        tarea_activa=False,
    )
    datos = crear_plan_schema(sector, equipo, tarea)

    with pytest.raises(HTTPException) as error:
        services.crear_plan(db_session, datos)

    assert error.value.status_code == 400


def test_modificar_plan_correctamente(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)

    plan_creado = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    datos_actualizados = schemas.PlanUpdate(
        titulo="Plan actualizado",
        fecha_inicio=date(2026, 2, 1),
        fecha_fin=date(2026, 11, 30),
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[tarea.id],
        activo=True,
    )

    resultado = services.modificar_plan(
        db_session,
        plan_creado.id,
        datos_actualizados,
    )

    assert resultado.titulo == "Plan actualizado"
    assert resultado.fecha_inicio == date(2026, 2, 1)
    assert resultado.fecha_fin == date(2026, 11, 30)
    assert resultado.activo is True


def test_desactivar_plan_registra_fecha(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)

    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    datos = schemas.PlanUpdate(
        titulo=plan.titulo,
        fecha_inicio=plan.fecha_inicio,
        fecha_fin=plan.fecha_fin,
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[tarea.id],
        activo=False,
    )

    resultado = services.modificar_plan(db_session, plan.id, datos)

    assert resultado.activo is False
    assert resultado.fecha_desactivacion == date.today()


def test_reactivar_plan_limpia_fecha_desactivacion(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)

    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    plan.activo = False
    plan.fecha_desactivacion = date.today()
    db_session.commit()

    datos = schemas.PlanUpdate(
        titulo=plan.titulo,
        fecha_inicio=plan.fecha_inicio,
        fecha_fin=plan.fecha_fin,
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[tarea.id],
        activo=True,
    )

    resultado = services.modificar_plan(db_session, plan.id, datos)

    assert resultado.activo is True
    assert resultado.fecha_desactivacion is None


def test_modificar_plan_inexistente(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)

    datos = crear_plan_schema(sector, equipo, tarea)
    datos_update = schemas.PlanUpdate(**datos.model_dump())

    with pytest.raises(exceptions.PlanNoEncontrado):
        services.modificar_plan(db_session, 9999, datos_update)



def test_no_permite_eliminar_plan_activo(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    with pytest.raises(HTTPException) as error:
        services.eliminar_plan(db_session, plan.id)

    assert error.value.status_code == 400


def test_no_permite_eliminar_plan_inactivo_menos_de_7_dias(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    plan.activo = False
    plan.fecha_desactivacion = date.today() - timedelta(days=6)
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        services.eliminar_plan(db_session, plan.id)

    assert error.value.status_code == 400


def test_eliminar_plan_inactivo_hace_7_dias(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    plan_id = plan.id
    plan.activo = False
    plan.fecha_desactivacion = date.today() - timedelta(days=7)
    db_session.commit()

    resultado = services.eliminar_plan(db_session, plan_id)

    assert resultado.id == plan_id
    assert resultado.msg == "borrado"

    with pytest.raises(exceptions.PlanNoEncontrado):
        services.leer_plan(db_session, plan_id)



def test_no_permite_crear_plan_con_sector_inexistente(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    datos = crear_plan_schema(sector, equipo, tarea)
    datos.sector_id = 9999

    with pytest.raises(sectores_exceptions.SectorNoEncontrado):
        services.crear_plan(db_session, datos)


def test_no_permite_crear_plan_con_equipo_inexistente(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    datos = crear_plan_schema(sector, equipo, tarea)
    datos.equipos_ids = [9999]

    with pytest.raises(equipos_exceptions.EquipoNoEncontrado):
        services.crear_plan(db_session, datos)


def test_no_permite_crear_plan_con_tarea_inexistente(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    datos = crear_plan_schema(sector, equipo, tarea)
    datos.tareas_ids = [9999]

    with pytest.raises(tareas_exceptions.TareaNoEncontrada):
        services.crear_plan(db_session, datos)


def test_modificar_plan_conservando_titulo(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    datos = schemas.PlanUpdate(
        titulo=plan.titulo,
        fecha_inicio=date(2026, 2, 1),
        fecha_fin=date(2026, 11, 30),
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[tarea.id],
        activo=True,
    )

    resultado = services.modificar_plan(db_session, plan.id, datos)

    assert resultado.titulo == "Plan de prueba"
    assert resultado.fecha_inicio == date(2026, 2, 1)


def test_no_permite_crear_plan_con_fecha_fin_anterior(db_session):
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        schemas.PlanCreate(
            titulo="Plan inválido",
            fecha_inicio=date(2026, 12, 31),
            fecha_fin=date(2026, 1, 1),
            sector_id=1,
            equipos_ids=[1],
            tareas_ids=[1],
        )


def test_no_permite_modificar_plan_con_fecha_fin_anterior(db_session):

    with pytest.raises(ValidationError):
        schemas.PlanUpdate(
            titulo="Plan inválido",
            fecha_inicio=date(2026, 12, 31),
            fecha_fin=date(2026, 1, 1),
            sector_id=1,
            equipos_ids=[1],
            tareas_ids=[1],
            activo=True,
        )



def test_no_permite_modificar_plan_con_titulo_duplicado(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)

    plan1 = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea, titulo="Plan uno"),
    )

    plan2 = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea, titulo="Plan dos"),
    )

    datos = schemas.PlanUpdate(
        titulo="Plan dos",
        fecha_inicio=plan1.fecha_inicio,
        fecha_fin=plan1.fecha_fin,
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[tarea.id],
        activo=True,
    )

    with pytest.raises(exceptions.TituloDuplicado):
        services.modificar_plan(db_session, plan1.id, datos)



def test_no_permite_modificar_plan_con_equipo_daniado(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    equipo.estado = EstadoEquipo.DANADO
    db_session.commit()

    datos = schemas.PlanUpdate(
        titulo=plan.titulo,
        fecha_inicio=plan.fecha_inicio,
        fecha_fin=plan.fecha_fin,
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[tarea.id],
        activo=True,
    )

    with pytest.raises(exceptions.EquipoDanado):
        services.modificar_plan(db_session, plan.id, datos)


def test_no_permite_modificar_plan_con_equipo_inactivo(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    equipo.activo = False
    db_session.commit()

    datos = schemas.PlanUpdate(
        titulo=plan.titulo,
        fecha_inicio=plan.fecha_inicio,
        fecha_fin=plan.fecha_fin,
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[tarea.id],
        activo=True,
    )

    with pytest.raises(HTTPException) as error:
        services.modificar_plan(db_session, plan.id, datos)

    assert error.value.status_code == 400


def test_no_permite_modificar_plan_con_equipo_inexistente(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    datos = schemas.PlanUpdate(
        titulo=plan.titulo,
        fecha_inicio=plan.fecha_inicio,
        fecha_fin=plan.fecha_fin,
        sector_id=sector.id,
        equipos_ids=[9999],
        tareas_ids=[tarea.id],
        activo=True,
    )

    with pytest.raises(equipos_exceptions.EquipoNoEncontrado):
        services.modificar_plan(db_session, plan.id, datos)


def test_no_permite_modificar_plan_con_tarea_inactiva(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    tarea.activo = False
    db_session.commit()

    datos = schemas.PlanUpdate(
        titulo=plan.titulo,
        fecha_inicio=plan.fecha_inicio,
        fecha_fin=plan.fecha_fin,
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[tarea.id],
        activo=True,
    )

    with pytest.raises(HTTPException) as error:
        services.modificar_plan(db_session, plan.id, datos)

    assert error.value.status_code == 400


def test_no_permite_modificar_plan_con_tarea_inexistente(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    datos = schemas.PlanUpdate(
        titulo=plan.titulo,
        fecha_inicio=plan.fecha_inicio,
        fecha_fin=plan.fecha_fin,
        sector_id=sector.id,
        equipos_ids=[equipo.id],
        tareas_ids=[9999],
        activo=True,
    )

    with pytest.raises(tareas_exceptions.TareaNoEncontrada):
        services.modificar_plan(db_session, plan.id, datos)


def test_no_permite_eliminar_plan_inexistente(db_session):
    with pytest.raises(exceptions.PlanNoEncontrado):
        services.eliminar_plan(db_session, 9999)


def test_no_permite_eliminar_plan_sin_fecha_desactivacion(db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    plan = services.crear_plan(
        db_session,
        crear_plan_schema(sector, equipo, tarea),
    )

    plan.activo = False
    plan.fecha_desactivacion = None
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        services.eliminar_plan(db_session, plan.id)

    assert error.value.status_code == 400
