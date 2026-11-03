from datetime import date, timedelta
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.elementos_limpieza import services, schemas, exceptions
from src.elementos_limpieza.constants import EstadoRecambio


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - SERVICES)

def test_crear_elemento_exito(db_session: Session):
    """Verifica la creación exitosa de un elemento de limpieza con frecuencia de recambio."""
    data = schemas.ElementoLimpiezaCreate(
        nombre="elemento test",
        frecuencia_recambio_dias=30,
        fecha_ultimo_recambio=date.today(),
        activo=True
    )

    elemento = services.crear_elemento(db_session, data)
    assert elemento.id is not None
    assert elemento.nombre == "elemento test"
    assert elemento.frecuencia_recambio_dias == 30
    assert elemento.fecha_proximo_recambio == date.today() + timedelta(days=30)
    assert elemento.estado_recambio == EstadoRecambio.VIGENTE


def test_crear_elemento_sin_frecuencia(db_session: Session):
    """Verifica crear un elemento sin frecuencia de recambio (estado SIN_CONTROL)."""
    data = schemas.ElementoLimpiezaCreate(
        nombre="elemento balde test",
        frecuencia_recambio_dias=None,
        activo=True
    )

    elemento = services.crear_elemento(db_session, data)
    assert elemento.frecuencia_recambio_dias is None
    assert elemento.fecha_proximo_recambio is None
    assert elemento.estado_recambio == EstadoRecambio.SIN_CONTROL


def test_listar_elementos_y_alertas(db_session: Session):
    """Verifica listar elementos de limpieza y filtrar alertas (vencidos o próximos a vencer)."""
    hoy = date.today()

    # Elemento vigente (no debe salir en alertas)
    services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(
            nombre="elemento mopa vigente",
            frecuencia_recambio_dias=60,
            fecha_ultimo_recambio=hoy
        )
    )

    # Elemento vencido (recambio era hace 30 días con frecuencia de 15)
    services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(
            nombre="elemento mopa vencida",
            frecuencia_recambio_dias=15,
            fecha_ultimo_recambio=hoy - timedelta(days=30)
        )
    )

    # Elemento próximo a vencer (vence en 5 días, menor a los 10 días de aviso)
    services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(
            nombre="elemento mopa proxima",
            frecuencia_recambio_dias=30,
            fecha_ultimo_recambio=hoy - timedelta(days=25)
        )
    )

    todos = services.listar_elementos(db_session)
    assert len(todos) == 3

    alertas = services.listar_alertas(db_session)
    assert len(alertas) == 2
    nombres_alertas = [a.nombre for a in alertas]
    assert "elemento mopa vencida" in nombres_alertas
    assert "elemento mopa proxima" in nombres_alertas


def test_leer_elemento_exito(db_session: Session):
    """Verifica la lectura individual de un elemento de limpieza por ID."""
    creado = services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(nombre="elemento guantes test", frecuencia_recambio_dias=15)
    )

    leido = services.leer_elemento(db_session, creado.id)
    assert leido.id == creado.id
    assert leido.nombre == "elemento guantes test"


def test_modificar_elemento_exito(db_session: Session):
    """Verifica la modificación de los datos de un elemento de limpieza."""
    creado = services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(nombre="elemento esponja test", frecuencia_recambio_dias=7)
    )

    update_data = schemas.ElementoLimpiezaUpdate(
        nombre="elemento esponja modificada test",
        frecuencia_recambio_dias=10,
        activo=True
    )
    modificado = services.modificar_elemento(db_session, creado.id, update_data)
    assert modificado.nombre == "elemento esponja modificada test"
    assert modificado.frecuencia_recambio_dias == 10


def test_registrar_recambio_exito(db_session: Session):
    """Verifica registrar el recambio de un elemento, actualizando la fecha base."""
    fecha_antigua = date.today() - timedelta(days=40)
    creado = services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(
            nombre="elemento paño test",
            frecuencia_recambio_dias=30,
            fecha_ultimo_recambio=fecha_antigua
        )
    )

    # Registrar recambio con fecha de hoy
    recambio_data = schemas.RecambioCreate(fecha_recambio=date.today())
    actualizado = services.registrar_recambio(db_session, creado.id, recambio_data)

    assert actualizado.fecha_ultimo_recambio == date.today()
    assert actualizado.estado_recambio == EstadoRecambio.VIGENTE


def test_eliminar_elemento_inactivo_exito(db_session: Session):
    """Verifica que un elemento en estado inactivo (activo=False) se elimine físicamente."""
    creado = services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(nombre="elemento inactivo test", activo=False)
    )

    resultado = services.eliminar_elemento(db_session, creado.id)
    assert resultado["id"] == creado.id
    assert resultado["msg"] == "borrado"

    with pytest.raises(exceptions.ElementoNoEncontrado):
        services.leer_elemento(db_session, creado.id)


# PRUEBAS NEGATIVAS (CASOS DE FALLA - SERVICES)

def test_crear_elemento_fecha_futura(db_session: Session):
    """Verifica que crear un elemento con fecha_ultimo_recambio posterior a hoy lance FechaFutura."""
    fecha_futura = date.today() + timedelta(days=5)
    data = schemas.ElementoLimpiezaCreate(
        nombre="elemento futuro test",
        fecha_ultimo_recambio=fecha_futura
    )

    with pytest.raises(exceptions.FechaFutura):
        services.crear_elemento(db_session, data)


def test_leer_elemento_inexistente(db_session: Session):
    """Verifica que leer un elemento por ID inexistente lance ElementoNoEncontrado."""
    with pytest.raises(exceptions.ElementoNoEncontrado):
        services.leer_elemento(db_session, 9999)


def test_modificar_elemento_inexistente(db_session: Session):
    """Verifica que modificar un elemento inexistente lance ElementoNoEncontrado."""
    update_data = schemas.ElementoLimpiezaUpdate(nombre="elemento test", activo=True)
    with pytest.raises(exceptions.ElementoNoEncontrado):
        services.modificar_elemento(db_session, 9999, update_data)


def test_modificar_elemento_fecha_futura(db_session: Session):
    """Verifica que actualizar un elemento con una fecha futura lance FechaFutura."""
    creado = services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(nombre="elemento cepillo test")
    )
    update_data = schemas.ElementoLimpiezaUpdate(
        nombre="elemento cepillo test",
        fecha_ultimo_recambio=date.today() + timedelta(days=10)
    )

    with pytest.raises(exceptions.FechaFutura):
        services.modificar_elemento(db_session, creado.id, update_data)


def test_registrar_recambio_sin_frecuencia(db_session: Session):
    """Verifica que intentar registrar recambio en un elemento sin frecuencia configurada lance SinFrecuencia."""
    creado = services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(nombre="elemento sin frecuencia test", frecuencia_recambio_dias=None)
    )

    recambio_data = schemas.RecambioCreate(fecha_recambio=date.today())
    with pytest.raises(exceptions.SinFrecuencia):
        services.registrar_recambio(db_session, creado.id, recambio_data)


def test_registrar_recambio_fecha_futura(db_session: Session):
    """Verifica que registrar recambio con fecha futura lance FechaFutura."""
    creado = services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(nombre="elemento mopa recambio test", frecuencia_recambio_dias=15)
    )

    recambio_data = schemas.RecambioCreate(fecha_recambio=date.today() + timedelta(days=2))
    with pytest.raises(exceptions.FechaFutura):
        services.registrar_recambio(db_session, creado.id, recambio_data)


def test_eliminar_elemento_activo_falla(db_session: Session):
    """Verifica que intentar eliminar físicamente un elemento activo (activo=True) lance HTTP 400."""
    creado = services.crear_elemento(
        db_session,
        schemas.ElementoLimpiezaCreate(nombre="elemento activo test", activo=True)
    )

    with pytest.raises(HTTPException) as exc_info:
        services.eliminar_elemento(db_session, creado.id)
    assert exc_info.value.status_code == 400
    assert "activos no se pueden eliminar físicamente" in exc_info.value.detail


def test_eliminar_elemento_inexistente(db_session: Session):
    """Verifica que eliminar un elemento inexistente lance ElementoNoEncontrado."""
    with pytest.raises(exceptions.ElementoNoEncontrado):
        services.eliminar_elemento(db_session, 9999)
