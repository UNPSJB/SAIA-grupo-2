import pytest
from sqlalchemy.orm import Session

from src.unidades_medida import services, schemas, exceptions


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - SERVICES)

def test_crear_unidad_medida_exito(db_session: Session):
    """Verifica la creación correcta de una unidad de medida."""
    data = schemas.UnidadMedidaCreate(nombre="unidad test")
    unidad = services.crear_unidad_medida(db_session, data)

    assert unidad.id is not None
    assert unidad.nombre == "unidad test"


def test_listar_unidades_medida_vacia_y_con_datos(db_session: Session):
    """Verifica el listado de unidades cuando está vacío y cuando contiene elementos."""
    assert services.listar_unidades_medida(db_session) == []

    services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad kilogramos test"))
    services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad metros test"))

    lista = services.listar_unidades_medida(db_session)
    assert len(lista) == 2
    nombres = [u.nombre for u in lista]
    assert "unidad kilogramos test" in nombres
    assert "unidad metros test" in nombres


def test_leer_unidad_medida_exito(db_session: Session):
    """Verifica consultar una unidad de medida existente por su ID."""
    creada = services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad gramos test"))
    leida = services.leer_unidad_medida(db_session, creada.id)

    assert leida.id == creada.id
    assert leida.nombre == "unidad gramos test"


def test_modificar_unidad_medida_exito(db_session: Session):
    """Verifica modificar el nombre de una unidad de medida."""
    creada = services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad mililitro test"))
    update_data = schemas.UnidadMedidaUpdate(nombre="unidad mililitros modificada test")

    modificada = services.modificar_unidad_medida(db_session, creada.id, update_data)
    assert modificada.id == creada.id
    assert modificada.nombre == "unidad mililitros modificada test"


def test_eliminar_unidad_medida_exito(db_session: Session):
    """Verifica eliminar físicamente una unidad de medida existente."""
    creada = services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad borrable test"))
    services.eliminar_unidad_medida(db_session, creada.id)

    with pytest.raises(exceptions.UnidadMedidaNoEncontrada):
        services.leer_unidad_medida(db_session, creada.id)


# PRUEBAS NEGATIVAS (CASOS DE FALLA - SERVICES)

def test_crear_unidad_medida_nombre_vacio(db_session: Session):
    """Verifica que crear una unidad con nombre vacío "" lance NombreVacio."""
    data = schemas.UnidadMedidaCreate(nombre="")
    with pytest.raises(exceptions.NombreVacio):
        services.crear_unidad_medida(db_session, data)


def test_crear_unidad_medida_duplicada(db_session: Session):
    """Verifica que crear una unidad con un nombre ya registrado lance UnidadMedidaDuplicada."""
    services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad centimetros test"))
    with pytest.raises(exceptions.UnidadMedidaDuplicada):
        services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad centimetros test"))


def test_leer_unidad_medida_inexistente(db_session: Session):
    """Verifica que leer una unidad inexistente lance UnidadMedidaNoEncontrada."""
    with pytest.raises(exceptions.UnidadMedidaNoEncontrada):
        services.leer_unidad_medida(db_session, 9999)


def test_modificar_unidad_medida_inexistente(db_session: Session):
    """Verifica que modificar una unidad inexistente lance UnidadMedidaNoEncontrada."""
    with pytest.raises(exceptions.UnidadMedidaNoEncontrada):
        services.modificar_unidad_medida(db_session, 9999, schemas.UnidadMedidaUpdate(nombre="unidad test"))


def test_modificar_unidad_medida_nombre_vacio(db_session: Session):
    """Verifica que intentar actualizar el nombre a vacío "" lance NombreVacio."""
    creada = services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad horas test"))
    with pytest.raises(exceptions.NombreVacio):
        services.modificar_unidad_medida(db_session, creada.id, schemas.UnidadMedidaUpdate(nombre=""))


def test_modificar_unidad_medida_duplicada(db_session: Session):
    """Verifica que renombrar una unidad a un nombre perteneciente a otra lance UnidadMedidaDuplicada."""
    u1 = services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad a test"))
    u2 = services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(nombre="unidad b test"))

    with pytest.raises(exceptions.UnidadMedidaDuplicada):
        services.modificar_unidad_medida(db_session, u2.id, schemas.UnidadMedidaUpdate(nombre="unidad a test"))


def test_eliminar_unidad_medida_inexistente(db_session: Session):
    """Verifica que eliminar una unidad inexistente lance UnidadMedidaNoEncontrada."""
    with pytest.raises(exceptions.UnidadMedidaNoEncontrada):
        services.eliminar_unidad_medida(db_session, 9999)
