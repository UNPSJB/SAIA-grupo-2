import pytest
from sqlalchemy.orm import Session

from src.capacidades import services, schemas, exceptions
from src.capacidades.models import Capacidad
from src.empleados.models import Empleado, RolEmpleado
from src.sectores.models import Sector

# PRUEBAS POSITIVAS (CASOS DE ÉXITO - SERVICES)

def test_crear_capacidad_exito(db_session: Session):
    """Verifica que se cree una capacidad correctamente y que el nombre se normalice a minúsculas."""
    data = schemas.CapacidadCreate(nombre=" Capacidad Test ")
    resultado = services.crear_capacidad(db_session, data)

    assert resultado.id is not None
    assert resultado.nombre == "capacidad test"
    assert resultado.empleados == []


def test_listar_capacidades_vacia_y_con_datos(db_session: Session):
    """Verifica la lista de capacidades cuando está vacía y cuando contiene elementos."""
    assert services.listar_capacidades(db_session) == []

    services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="mecanico test"))
    services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="operario test"))

    lista = services.listar_capacidades(db_session)
    assert len(lista) == 2
    nombres = [c.nombre for c in lista]
    assert "mecanico test" in nombres
    assert "operario test" in nombres


def test_leer_capacidad_exito(db_session: Session):
    """Verifica la lectura individual de una capacidad por su ID."""
    creada = services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="supervisor test"))
    leida = services.leer_capacidad(db_session, creada.id)

    assert leida.id == creada.id
    assert leida.nombre == "supervisor test"


def test_modificar_capacidad_exito(db_session: Session):
    """Verifica la modificación del nombre de una capacidad existente."""
    creada = services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="tecnico test"))
    update_data = schemas.CapacidadUpdate(nombre="tecnico senior test")

    modificada = services.modificar_capacidad(db_session, creada.id, update_data)

    assert modificada.id == creada.id
    assert modificada.nombre == "tecnico senior test"


def test_eliminar_capacidad_exito(db_session: Session):
    """Verifica la eliminación física de una capacidad sin empleados asociados."""
    creada = services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="limpieza test"))

    eliminada = services.eliminar_capacidad(db_session, creada.id)
    assert eliminada.id == creada.id

    with pytest.raises(exceptions.CapacidadNoEncontrada):
        services.leer_capacidad(db_session, creada.id)


def test_eliminar_capacidad_con_empleados_asociados(db_session: Session):
    """Verifica que eliminar una capacidad asociada a un empleado (Román Riquelme) desvincule la asociación sin fallar."""
    # Crear un sector primero para el empleado
    sector = Sector(nombre="Mantenimiento Test", activo=True)
    db_session.add(sector)
    db_session.commit()

    # Crear capacidad
    capacidad = services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="calibrador test"))

    # Crear empleado asignándole la capacidad
    db_capacidad = db_session.get(Capacidad, capacidad.id)
    empleado = Empleado(
        legajo="EMP-1001",
        dni="12345678",
        nombre="Román",
        apellido="Riquelme",
        rol=RolEmpleado.OPERARIO,
        activo=True,
        capacidades=[db_capacidad],
        sectores=[sector]
    )
    db_session.add(empleado)
    db_session.commit()

    # Eliminar capacidad
    eliminada = services.eliminar_capacidad(db_session, capacidad.id)
    assert eliminada.id == capacidad.id

    # Confirmar que la capacidad ya no existe
    with pytest.raises(exceptions.CapacidadNoEncontrada):
        services.leer_capacidad(db_session, capacidad.id)

# PRUEBAS NEGATIVAS (CASOS DE FALLA - SERVICES)

def test_crear_capacidad_duplicada(db_session: Session):
    """Verifica que intentar crear una capacidad con un nombre existente lance NombreDuplicado."""
    services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="electricista test"))

    with pytest.raises(exceptions.NombreDuplicado):
        services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="ELECTRICISTA TEST"))


def test_leer_capacidad_inexistente(db_session: Session):
    """Verifica que buscar una capacidad por un ID inexistente lance CapacidadNoEncontrada."""
    with pytest.raises(exceptions.CapacidadNoEncontrada):
        services.leer_capacidad(db_session, 9999)


def test_modificar_capacidad_inexistente(db_session: Session):
    """Verifica que intentar modificar una capacidad inexistente lance CapacidadNoEncontrada."""
    update_data = schemas.CapacidadUpdate(nombre="nuevo nombre test")
    with pytest.raises(exceptions.CapacidadNoEncontrada):
        services.modificar_capacidad(db_session, 9999, update_data)


def test_modificar_capacidad_nombre_duplicado(db_session: Session):
    """Verifica que renombrar una capacidad a un nombre que ya pertenece a otra capacidad lance NombreDuplicado."""
    cap1 = services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="mecanico test"))
    cap2 = services.crear_capacidad(db_session, schemas.CapacidadCreate(nombre="electricista test"))

    update_data = schemas.CapacidadUpdate(nombre="mecanico test")
    with pytest.raises(exceptions.NombreDuplicado):
        services.modificar_capacidad(db_session, cap2.id, update_data)


def test_eliminar_capacidad_inexistente(db_session: Session):
    """Verifica que intentar eliminar una capacidad inexistente lance CapacidadNoEncontrada."""
    with pytest.raises(exceptions.CapacidadNoEncontrada):
        services.eliminar_capacidad(db_session, 9999)
