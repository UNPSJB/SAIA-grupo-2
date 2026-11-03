import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.empleados import services, schemas, exceptions
from src.empleados.models import Empleado, RolEmpleado
from src.capacidades.models import Capacidad
from src.capacidades import exceptions as CapacidadesExceptions
from src.sectores.models import Sector


def _crear_sector_base(db: Session, nombre: str = "Planta Principal") -> Sector:
    sector = Sector(nombre=nombre, activo=True)
    db.add(sector)
    db.commit()
    db.refresh(sector)
    return sector


def _crear_capacidad_base(db: Session, nombre: str = "operario") -> Capacidad:
    capacidad = Capacidad(nombre=nombre.strip().lower())
    db.add(capacidad)
    db.commit()
    db.refresh(capacidad)
    return capacidad


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - SERVICES)

def test_crear_empleado_exito(db_session: Session):
    """Verifica la creación exitosa del empleado Román Riquelme y la generación automática de legajo."""
    sector = _crear_sector_base(db_session, "Sector Empaque")
    capacidad = _crear_capacidad_base(db_session, "operario")

    data = schemas.EmpleadoCreate(
        dni="12345678",
        nombre="Román",
        apellido="Riquelme",
        activo=True,
        listaSectores=[sector.id],
        listaCapacidades=[capacidad.id]
    )

    empleado = services.crear_empleado(db_session, data)

    assert empleado.id is not None
    assert empleado.legajo == "EMP-1000"
    assert empleado.dni == "12345678"
    assert empleado.nombre == "Román"
    assert empleado.apellido == "Riquelme"
    assert empleado.rol == RolEmpleado.OPERARIO
    assert len(empleado.sectores) == 1
    assert empleado.sectores[0].id == sector.id


def test_crear_empleado_rol_admin_automatico(db_session: Session):
    """Verifica que asignar la capacidad 'Administrador' otorgue el rol ADMIN al empleado Lionel Messi."""
    sector = _crear_sector_base(db_session, "Sector Sistemas")
    cap_admin = _crear_capacidad_base(db_session, "Administrador")

    data = schemas.EmpleadoCreate(
        dni="87654321",
        nombre="Lionel",
        apellido="Messi",
        listaSectores=[sector.id],
        listaCapacidades=[cap_admin.id]
    )

    empleado = services.crear_empleado(db_session, data)
    assert empleado.nombre == "Lionel"
    assert empleado.apellido == "Messi"
    assert empleado.rol == RolEmpleado.ADMIN


def test_crear_empleado_capacidad_defecto(db_session: Session):
    """Verifica que si no se envían capacidades a Emiliano Martínez, se asigne la capacidad por defecto ('operario')."""
    sector = _crear_sector_base(db_session, "Sector Saneamiento")
    _crear_capacidad_base(db_session, "operario")

    data = schemas.EmpleadoCreate(
        dni="11223344",
        nombre="Emiliano",
        apellido="Martínez",
        listaSectores=[sector.id],
        listaCapacidades=None
    )

    empleado = services.crear_empleado(db_session, data)
    assert len(empleado.capacidades) == 1
    assert empleado.capacidades[0].nombre == "operario"


def test_autenticar_empleado_exito(db_session: Session):
    """Verifica la autenticación correcta con legajo y DNI del empleado Ángel Di María."""
    sector = _crear_sector_base(db_session)
    data = schemas.EmpleadoCreate(
        dni="99887766",
        nombre="Ángel",
        apellido="Di María",
        listaSectores=[sector.id]
    )
    creado = services.crear_empleado(db_session, data)

    credenciales = schemas.LoginRequest(legajo=creado.legajo, dni="99887766")
    autenticado = services.autenticar_empleado(db_session, credenciales)

    assert autenticado.id == creado.id
    assert autenticado.legajo == creado.legajo


def test_listar_y_leer_empleados(db_session: Session):
    """Verifica listar empleados y consultar por ID al empleado Alexis Mac Allister."""
    assert services.listar_empleados(db_session) == []

    sector = _crear_sector_base(db_session)
    emp1 = services.crear_empleado(
        db_session,
        schemas.EmpleadoCreate(dni="1111", nombre="Alexis", apellido="Mac Allister", listaSectores=[sector.id])
    )

    lista = services.listar_empleados(db_session)
    assert len(lista) == 1

    leido = services.leer_empleado(db_session, emp1.id)
    assert leido.id == emp1.id
    assert leido.dni == "1111"
    assert leido.nombre == "Alexis"


def test_modificar_empleado_exito(db_session: Session):
    """Verifica modificar los datos personales y capacidades de Julián Álvarez."""
    sector = _crear_sector_base(db_session)
    cap_admin = _crear_capacidad_base(db_session, "Administrador")

    emp = services.crear_empleado(
        db_session,
        schemas.EmpleadoCreate(dni="5555", nombre="Julián", apellido="Álvarez", listaSectores=[sector.id])
    )

    update_data = schemas.EmpleadoUpdate(
        dni="5555",
        nombre="Julián",
        apellido="Álvarez Fernández",
        activo=True,
        listaSectores=[sector.id],
        listaCapacidades=[cap_admin.id]
    )

    modificado = services.modificar_empleado(db_session, emp.id, update_data)
    assert modificado.nombre == "Julián"
    assert modificado.apellido == "Álvarez Fernández"
    assert modificado.rol == RolEmpleado.ADMIN


def test_eliminar_empleado_inactivo_exito(db_session: Session):
    """Verifica que un empleado inactivo (Rodrigo De Paul) que no es encargado de sector se pueda eliminar físicamente."""
    sector = _crear_sector_base(db_session)
    emp = services.crear_empleado(
        db_session,
        schemas.EmpleadoCreate(dni="7777", nombre="Rodrigo", apellido="De Paul", listaSectores=[sector.id])
    )

    # Dar de baja lógica primero
    update_data = schemas.EmpleadoUpdate(
        dni="7777",
        nombre="Rodrigo",
        apellido="De Paul",
        activo=False,
        listaSectores=[sector.id]
    )
    services.modificar_empleado(db_session, emp.id, update_data)

    # Eliminar físicamente
    eliminado = services.eliminar_empleado(db_session, emp.id)
    assert eliminado.id == emp.id

    with pytest.raises(exceptions.EmpleadoNoEncontrado):
        services.leer_empleado(db_session, emp.id)


# PRUEBAS NEGATIVAS (CASOS DE FALLA - SERVICES)

def test_crear_empleado_dni_duplicado(db_session: Session):
    """Verifica que crear un empleado con un DNI ya registrado lance DniDuplicado."""
    sector = _crear_sector_base(db_session)
    data1 = schemas.EmpleadoCreate(dni="33334444", nombre="Enzo", apellido="Fernández", listaSectores=[sector.id])
    services.crear_empleado(db_session, data1)

    data2 = schemas.EmpleadoCreate(dni="33334444", nombre="Lautaro", apellido="Martínez", listaSectores=[sector.id])
    with pytest.raises(exceptions.DniDuplicado):
        services.crear_empleado(db_session, data2)


def test_crear_empleado_sin_sector(db_session: Session):
    """Verifica que crear un empleado sin asignar sectores lance SectorRequerido."""
    data = schemas.EmpleadoCreate(dni="12341234", nombre="Lisandro", apellido="Martínez", listaSectores=[])
    with pytest.raises(exceptions.SectorRequerido):
        services.crear_empleado(db_session, data)


def test_crear_empleado_capacidad_inexistente(db_session: Session):
    """Verifica que asignar una capacidad inexistente lance CapacidadNoEncontrada."""
    sector = _crear_sector_base(db_session)
    data = schemas.EmpleadoCreate(
        dni="12341234",
        nombre="Leandro",
        apellido="Paredes",
        listaSectores=[sector.id],
        listaCapacidades=[9999]
    )
    with pytest.raises(CapacidadesExceptions.CapacidadNoEncontrada):
        services.crear_empleado(db_session, data)


def test_autenticar_credenciales_invalidas(db_session: Session):
    """Verifica que autenticar con legajo o DNI incorrecto lance CredencialesInvalidas."""
    sector = _crear_sector_base(db_session)
    emp = services.crear_empleado(
        db_session,
        schemas.EmpleadoCreate(dni="44445555", nombre="Nicolás", apellido="Otamendi", listaSectores=[sector.id])
    )

    # DNI incorrecto
    with pytest.raises(exceptions.CredencialesInvalidas):
        services.autenticar_empleado(
            db_session, schemas.LoginRequest(legajo=emp.legajo, dni="00000000")
        )

    # Legajo incorrecto
    with pytest.raises(exceptions.CredencialesInvalidas):
        services.autenticar_empleado(
            db_session, schemas.LoginRequest(legajo="EMP-9999", dni="44445555")
        )


def test_autenticar_empleado_inactivo(db_session: Session):
    """Verifica que un empleado inactivo no pueda autenticarse."""
    sector = _crear_sector_base(db_session)
    emp = services.crear_empleado(
        db_session,
        schemas.EmpleadoCreate(dni="66667777", nombre="Nahuel", apellido="Molina", listaSectores=[sector.id])
    )

    # Inactivar
    services.modificar_empleado(
        db_session,
        emp.id,
        schemas.EmpleadoUpdate(
            dni="66667777", nombre="Nahuel", apellido="Molina", activo=False, listaSectores=[sector.id]
        )
    )

    with pytest.raises(exceptions.CredencialesInvalidas):
        services.autenticar_empleado(
            db_session, schemas.LoginRequest(legajo=emp.legajo, dni="66667777")
        )


def test_modificar_empleado_dni_duplicado(db_session: Session):
    """Verifica que cambiar el DNI de un empleado a uno perteneciente a otro empleado lance DniDuplicado."""
    sector = _crear_sector_base(db_session)
    emp1 = services.crear_empleado(
        db_session, schemas.EmpleadoCreate(dni="1111", nombre="Gonzalo", apellido="Montiel", listaSectores=[sector.id])
    )
    emp2 = services.crear_empleado(
        db_session, schemas.EmpleadoCreate(dni="2222", nombre="Marcos", apellido="Acuña", listaSectores=[sector.id])
    )

    update_data = schemas.EmpleadoUpdate(
        dni="1111", nombre="Marcos", apellido="Acuña", activo=True, listaSectores=[sector.id]
    )
    with pytest.raises(exceptions.DniDuplicado):
        services.modificar_empleado(db_session, emp2.id, update_data)


def test_modificar_empleado_baja_logica_responsable_sector(db_session: Session):
    """Verifica que no se pueda dar de baja lógica a un empleado si es encargado de un sector."""
    sector = _crear_sector_base(db_session)
    emp = services.crear_empleado(
        db_session, schemas.EmpleadoCreate(dni="1111", nombre="Exequiel", apellido="Palacios", listaSectores=[sector.id])
    )

    # Asignar empleado como responsable del sector
    sector.responsable_id = emp.id
    db_session.commit()

    update_data = schemas.EmpleadoUpdate(
        dni="1111", nombre="Exequiel", apellido="Palacios", activo=False, listaSectores=[sector.id]
    )

    with pytest.raises(HTTPException) as exc_info:
        services.modificar_empleado(db_session, emp.id, update_data)
    assert exc_info.value.status_code == 400
    assert "encargado del sector" in exc_info.value.detail


def test_eliminar_empleado_activo(db_session: Session):
    """Verifica que intentar eliminar físicamente a un empleado activo lance HTTP 400."""
    sector = _crear_sector_base(db_session)
    emp = services.crear_empleado(
        db_session, schemas.EmpleadoCreate(dni="1111", nombre="Guido", apellido="Rodríguez", listaSectores=[sector.id])
    )

    with pytest.raises(HTTPException) as exc_info:
        services.eliminar_empleado(db_session, emp.id)
    assert exc_info.value.status_code == 400
    assert "activos no se pueden eliminar físicamente" in exc_info.value.detail


def test_eliminar_empleado_inexistente(db_session: Session):
    """Verifica que intentar eliminar un empleado inexistente lance EmpleadoNoEncontrado."""
    with pytest.raises(exceptions.EmpleadoNoEncontrado):
        services.eliminar_empleado(db_session, 9999)
