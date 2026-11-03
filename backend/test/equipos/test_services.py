
from datetime import date, timedelta

import pytest
from fastapi import HTTPException

from src.equipos import services, schemas, exceptions
from src.equipos.constants import EstadoEquipo, EstadoMantenimiento
from src.equipos.models import Equipo, TipoEquipo
from src.sectores.models import Sector


@pytest.fixture
def datos_base(db_session):
    """Crea un sector y un tipo de equipo para reutilizar en los tests."""
    sector = Sector(nombre="Cocina test equipos")
    tipo = TipoEquipo(nombre="heladera")

    db_session.add_all([sector, tipo])
    db_session.commit()
    db_session.refresh(sector)
    db_session.refresh(tipo)

    return {"sector": sector, "tipo": tipo}


def crear_equipo_prueba(db_session, datos_base, **cambios):
    """Crea un equipo directamente en la base de datos de prueba."""
    datos = {
        "nombre": "Heladera de prueba",
        "activo": True,
        "sector_id": datos_base["sector"].id,
        "tipo_id": datos_base["tipo"].id,
        "estado": EstadoEquipo.BUENO,
        "frecuencia_mantenimiento_dias": 30,
        "fecha_ultimo_mantenimiento": date.today(),
    }
    datos.update(cambios)

    equipo = Equipo(**datos)
    db_session.add(equipo)
    db_session.commit()
    db_session.refresh(equipo)
    return equipo


def test_crear_equipo_exito(db_session, datos_base):
    frecuencia = 30
    proxima_fecha = date.today() + timedelta(days=frecuencia)

    payload = schemas.EquipoCreate(
        nombre="Heladera nueva",
        sector_id=datos_base["sector"].id,
        tipo_id=datos_base["tipo"].id,
        frecuencia_mantenimiento_dias=frecuencia,
        fecha_proximo_mantenimiento=proxima_fecha,
    )

    equipo = services.crear_equipo(db_session, payload)

    assert equipo.id is not None
    assert equipo.nombre == "Heladera nueva"
    assert equipo.sector_id == datos_base["sector"].id
    assert equipo.tipo_id == datos_base["tipo"].id
    assert equipo.fecha_ultimo_mantenimiento == date.today()
    assert equipo.fecha_proximo_mantenimiento == proxima_fecha


def test_crear_equipo_tipo_inexistente(db_session, datos_base):
    payload = schemas.EquipoCreate(
        nombre="Equipo sin tipo",
        sector_id=datos_base["sector"].id,
        tipo_id=9999,
        frecuencia_mantenimiento_dias=30,
    )

    with pytest.raises(exceptions.TipoEquipoNoEncontrado):
        services.crear_equipo(db_session, payload)


def test_crear_equipo_sector_inexistente(db_session, datos_base):
    payload = schemas.EquipoCreate(
        nombre="Equipo sin sector",
        sector_id=9999,
        tipo_id=datos_base["tipo"].id,
        frecuencia_mantenimiento_dias=30,
    )

    with pytest.raises(ValueError, match="El sector asignado no existe"):
        services.crear_equipo(db_session, payload)


def test_crear_equipo_fecha_vencida(db_session, datos_base):
    payload = schemas.EquipoCreate(
        nombre="Equipo con fecha vencida",
        sector_id=datos_base["sector"].id,
        tipo_id=datos_base["tipo"].id,
        frecuencia_mantenimiento_dias=30,
        fecha_proximo_mantenimiento=date.today() - timedelta(days=1),
    )

    with pytest.raises(exceptions.VencimientoInvalido):
        services.crear_equipo(db_session, payload)


def test_listar_equipos(db_session, datos_base):
    crear_equipo_prueba(db_session, datos_base, nombre="Heladera")
    crear_equipo_prueba(db_session, datos_base, nombre="Horno")

    equipos = services.listar_equipos(db_session)

    assert len(equipos) == 2
    assert {equipo.nombre for equipo in equipos} == {"Heladera", "Horno"}


def test_leer_equipo_exito(db_session, datos_base):
    equipo = crear_equipo_prueba(db_session, datos_base)

    resultado = services.leer_equipo(db_session, equipo.id)

    assert resultado.id == equipo.id
    assert resultado.nombre == equipo.nombre
    assert resultado.tipo.nombre == "heladera"
    assert resultado.sector.nombre == "Cocina test equipos"


def test_leer_equipo_inexistente(db_session):
    with pytest.raises(exceptions.EquipoNoEncontrado):
        services.leer_equipo(db_session, 9999)


def test_modificar_equipo_exito(db_session, datos_base):
    equipo = crear_equipo_prueba(db_session, datos_base)

    payload = schemas.EquipoUpdate(
        nombre="Heladera modificada",
        activo=True,
        sector_id=datos_base["sector"].id,
        tipo_id=datos_base["tipo"].id,
        estado=EstadoEquipo.DANADO,
        frecuencia_mantenimiento_dias=60,
    )

    resultado = services.modificar_equipo(db_session, equipo.id, payload)

    assert resultado.nombre == "Heladera modificada"
    assert resultado.estado == EstadoEquipo.DANADO
    assert resultado.frecuencia_mantenimiento_dias == 60


def test_modificar_equipo_tipo_inexistente(db_session, datos_base):
    equipo = crear_equipo_prueba(db_session, datos_base)

    payload = schemas.EquipoUpdate(
        nombre="Heladera modificada",
        activo=True,
        sector_id=datos_base["sector"].id,
        tipo_id=9999,
        estado=EstadoEquipo.BUENO,
        frecuencia_mantenimiento_dias=30,
    )

    with pytest.raises(exceptions.TipoEquipoNoEncontrado):
        services.modificar_equipo(db_session, equipo.id, payload)


def test_modificar_equipo_sector_inexistente(db_session, datos_base):
    equipo = crear_equipo_prueba(db_session, datos_base)

    payload = schemas.EquipoUpdate(
        nombre="Heladera modificada",
        activo=True,
        sector_id=9999,
        tipo_id=datos_base["tipo"].id,
        estado=EstadoEquipo.BUENO,
        frecuencia_mantenimiento_dias=30,
    )

    with pytest.raises(ValueError, match="El sector asignado no existe"):
        services.modificar_equipo(db_session, equipo.id, payload)


def test_eliminar_equipo_activo(db_session, datos_base):
    equipo = crear_equipo_prueba(db_session, datos_base, activo=True)

    with pytest.raises(HTTPException) as error:
        services.eliminar_equipo(db_session, equipo.id)

    assert error.value.status_code == 400
    assert "activos no se pueden eliminar físicamente" in error.value.detail


def test_eliminar_equipo_inexistente(db_session):
    with pytest.raises(exceptions.EquipoNoEncontrado):
        services.eliminar_equipo(db_session, 9999)


def test_eliminar_equipo_inactivo(db_session, datos_base):
    equipo = crear_equipo_prueba(db_session, datos_base, activo=False)

    resultado = services.eliminar_equipo(db_session, equipo.id)

    assert resultado.id == equipo.id
    assert resultado.nombre == equipo.nombre
    assert db_session.get(Equipo, equipo.id) is None


def test_estado_mantenimiento_sin_control(db_session, datos_base):
    equipo = crear_equipo_prueba(
        db_session,
        datos_base,
        frecuencia_mantenimiento_dias=None,
    )

    assert equipo.estado_mantenimiento == EstadoMantenimiento.SIN_CONTROL
    assert equipo.fecha_proximo_mantenimiento is None
    assert equipo.dias_restantes is None


def test_estado_mantenimiento_vencido(db_session, datos_base):
    equipo = crear_equipo_prueba(
        db_session,
        datos_base,
        frecuencia_mantenimiento_dias=30,
        fecha_ultimo_mantenimiento=date.today() - timedelta(days=31),
    )

    assert equipo.estado_mantenimiento == EstadoMantenimiento.VENCIDO


def test_estado_mantenimiento_proximo(db_session, datos_base):
    equipo = crear_equipo_prueba(
        db_session,
        datos_base,
        frecuencia_mantenimiento_dias=30,
        fecha_ultimo_mantenimiento=date.today() - timedelta(days=25),
    )

    assert equipo.estado_mantenimiento == EstadoMantenimiento.PROXIMO


def test_estado_mantenimiento_vigente(db_session, datos_base):
    equipo = crear_equipo_prueba(
        db_session,
        datos_base,
        frecuencia_mantenimiento_dias=30,
        fecha_ultimo_mantenimiento=date.today(),
    )

    assert equipo.estado_mantenimiento == EstadoMantenimiento.VIGENTE
