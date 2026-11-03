
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.sectores import services, schemas, exceptions


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - SERVICES)

def test_crear_sector_exito(db_session: Session):
    """Verifica que se pueda crear un sector correctamente."""
    data = schemas.SectorCreate(nombre="Cocina test")

    sector = services.crear_sector(db_session, data)

    assert sector.id is not None
    assert sector.nombre == "Cocina test"
    assert sector.activo is True


def test_listar_sectores_vacio_y_con_datos(db_session: Session):
    """Verifica el listado vacío y el listado con sectores."""
    assert services.listar_sectores(db_session) == []

    services.crear_sector(
        db_session,
        schemas.SectorCreate(nombre="Cocina test"),
    )
    services.crear_sector(
        db_session,
        schemas.SectorCreate(nombre="Depósito test"),
    )

    lista = services.listar_sectores(db_session)

    assert len(lista) == 2
    assert {sector.nombre for sector in lista} == {
        "Cocina test",
        "Depósito test",
    }


def test_leer_sector_exito(db_session: Session):
    """Verifica que se pueda consultar un sector por su ID."""
    creado = services.crear_sector(
        db_session,
        schemas.SectorCreate(nombre="Cocina lectura test"),
    )

    leido = services.leer_sector(db_session, creado.id)

    assert leido.id == creado.id
    assert leido.nombre == "Cocina lectura test"


def test_modificar_sector_exito(db_session: Session):
    """Verifica que se pueda modificar el nombre de un sector."""
    creado = services.crear_sector(
        db_session,
        schemas.SectorCreate(nombre="Cocina original test"),
    )

    data = schemas.SectorUpdate(
        nombre="Cocina modificada test",
        responsable_id=None,
        activo=True,
    )

    modificado = services.modificar_sector(db_session, creado.id, data)

    assert modificado.id == creado.id
    assert modificado.nombre == "Cocina modificada test"
    assert modificado.activo is True


def test_eliminar_sector_inactivo_vacio_exito(db_session: Session):
    """Verifica que un sector inactivo y sin asociaciones pueda eliminarse."""
    creado = services.crear_sector(
        db_session,
        schemas.SectorCreate(nombre="Sector eliminable test"),
    )

    data = schemas.SectorUpdate(
        nombre="Sector eliminable test",
        responsable_id=None,
        activo=False,
    )
    services.modificar_sector(db_session, creado.id, data)

    eliminado = services.eliminar_sector(db_session, creado.id)

    assert eliminado.id == creado.id

    with pytest.raises(exceptions.SectorNoEncontrado):
        services.leer_sector(db_session, creado.id)


# PRUEBAS NEGATIVAS (CASOS DE FALLA - SERVICES)

def test_crear_sector_nombre_duplicado(db_session: Session):
    """Verifica que no se permita repetir el nombre, ignorando mayúsculas."""
    services.crear_sector(
        db_session,
        schemas.SectorCreate(nombre="Cocina test"),
    )

    with pytest.raises(exceptions.NombreDuplicado):
        services.crear_sector(
            db_session,
            schemas.SectorCreate(nombre="COCINA TEST"),
        )


def test_leer_sector_inexistente(db_session: Session):
    """Verifica que consultar un ID inexistente produzca SectorNoEncontrado."""
    with pytest.raises(exceptions.SectorNoEncontrado):
        services.leer_sector(db_session, 9999)


def test_modificar_sector_inexistente(db_session: Session):
    """Verifica que modificar un sector inexistente produzca un error."""
    data = schemas.SectorUpdate(
        nombre="Sector inexistente test",
        responsable_id=None,
        activo=True,
    )

    with pytest.raises(exceptions.SectorNoEncontrado):
        services.modificar_sector(db_session, 9999, data)


def test_modificar_sector_nombre_duplicado(db_session: Session):
    """Verifica que no se pueda cambiar el nombre por el de otro sector."""
    services.crear_sector(
        db_session,
        schemas.SectorCreate(nombre="Cocina test"),
    )
    segundo = services.crear_sector(
        db_session,
        schemas.SectorCreate(nombre="Depósito test"),
    )

    data = schemas.SectorUpdate(
        nombre="Cocina test",
        responsable_id=None,
        activo=True,
    )

    with pytest.raises(exceptions.NombreDuplicado):
        services.modificar_sector(db_session, segundo.id, data)


def test_eliminar_sector_activo_falla(db_session: Session):
    """Verifica que no se pueda eliminar físicamente un sector activo."""
    creado = services.crear_sector(
        db_session,
        schemas.SectorCreate(nombre="Sector activo test"),
    )

    with pytest.raises(HTTPException) as exc_info:
        services.eliminar_sector(db_session, creado.id)

    assert exc_info.value.status_code == 400
    assert "activos no se pueden eliminar físicamente" in exc_info.value.detail


def test_eliminar_sector_inexistente(db_session: Session):
    """Verifica que eliminar un sector inexistente produzca un error."""
    with pytest.raises(exceptions.SectorNoEncontrado):
        services.eliminar_sector(db_session, 9999)


def test_dar_de_baja_sector_con_empleados_falla(db_session: Session):
    """Verifica que un sector con empleados asociados no pueda darse de baja."""
    from src.empleados.models import Empleado

    empleado = Empleado(
        nombre="Empleado",
        apellido="Test",
        legajo="TEST-SECTOR-001",
        dni="99999999",
    )
    db_session.add(empleado)
    db_session.commit()
    db_session.refresh(empleado)

    creado = services.crear_sector(
        db_session,
        schemas.SectorCreate(
            nombre="Sector con empleado test",
            listaEmpleados=[empleado.id],
        ),
    )

    data = schemas.SectorUpdate(
        nombre="Sector con empleado test",
        responsable_id=None,
        activo=False,
    )

    with pytest.raises(HTTPException) as exc_info:
        services.modificar_sector(db_session, creado.id, data)

    assert exc_info.value.status_code == 400
    assert "empleado(s)" in exc_info.value.detail
