import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.insumos import services, schemas, exceptions
from src.unidades_medida.models import UnidadMedida


def _crear_unidad_base(db: Session, nombre: str = "unidad insumo test") -> UnidadMedida:
    unidad = UnidadMedida(nombre=nombre)
    db.add(unidad)
    db.commit()
    db.refresh(unidad)
    return unidad


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - SERVICES)

def test_crear_insumo_exito(db_session: Session):
    """Verifica la creación exitosa de un insumo."""
    unidad = _crear_unidad_base(db_session)
    data = schemas.InsumoCreate(
        nombre="insumo test",
        unidad_medida_id=unidad.id,
        activo=True
    )

    insumo = services.crear_insumo(db_session, data)
    assert insumo.id is not None
    assert insumo.nombre == "insumo test"
    assert insumo.unidad_medida_id == unidad.id
    assert insumo.activo is True


def test_listar_insumos_vacio_y_con_datos(db_session: Session):
    """Verifica listar insumos vacíos y con elementos."""
    assert services.listar_insumos(db_session) == []

    unidad = _crear_unidad_base(db_session)
    services.crear_insumo(
        db_session,
        schemas.InsumoCreate(nombre="insumo 1 test", unidad_medida_id=unidad.id)
    )
    services.crear_insumo(
        db_session,
        schemas.InsumoCreate(nombre="insumo 2 test", unidad_medida_id=unidad.id)
    )

    lista = services.listar_insumos(db_session)
    assert len(lista) == 2


def test_leer_insumo_exito(db_session: Session):
    """Verifica leer un insumo por ID."""
    unidad = _crear_unidad_base(db_session)
    creado = services.crear_insumo(
        db_session,
        schemas.InsumoCreate(nombre="insumo lavandina test", unidad_medida_id=unidad.id)
    )

    leido = services.leer_insumo(db_session, creado.id)
    assert leido.id == creado.id
    assert leido.nombre == "insumo lavandina test"


def test_modificar_insumo_exito(db_session: Session):
    """Verifica modificar un insumo existente."""
    unidad = _crear_unidad_base(db_session)
    creado = services.crear_insumo(
        db_session,
        schemas.InsumoCreate(nombre="insumo jabon test", unidad_medida_id=unidad.id)
    )

    update_data = schemas.InsumoUpdate(
        nombre="insumo jabon modificado test",
        unidad_medida_id=unidad.id,
        activo=True
    )
    modificado = services.modificar_insumo(db_session, creado.id, update_data)
    assert modificado.nombre == "insumo jabon modificado test"


def test_eliminar_insumo_inactivo_exito(db_session: Session):
    """Verifica que un insumo dado de baja lógica (activo=False) se pueda eliminar físicamente."""
    unidad = _crear_unidad_base(db_session)
    creado = services.crear_insumo(
        db_session,
        schemas.InsumoCreate(nombre="insumo inactivo test", unidad_medida_id=unidad.id, activo=False)
    )

    resultado = services.eliminar_insumo(db_session, creado.id)
    assert resultado["id"] == creado.id
    assert resultado["msg"] == "borrado"

    with pytest.raises(exceptions.InsumoNoEncontrado):
        services.leer_insumo(db_session, creado.id)


# PRUEBAS NEGATIVAS (CASOS DE FALLA - SERVICES)

def test_crear_insumo_nombre_vacio(db_session: Session):
    """Verifica que crear un insumo con nombre "" lance NombreVacio."""
    unidad = _crear_unidad_base(db_session)
    data = schemas.InsumoCreate(nombre="", unidad_medida_id=unidad.id)
    with pytest.raises(exceptions.NombreVacio):
        services.crear_insumo(db_session, data)


def test_crear_insumo_nombre_duplicado(db_session: Session):
    """Verifica que crear un insumo con un nombre duplicado lance NombreDuplicado."""
    unidad = _crear_unidad_base(db_session)
    data1 = schemas.InsumoCreate(nombre="insumo alcohol test", unidad_medida_id=unidad.id)
    services.crear_insumo(db_session, data1)

    data2 = schemas.InsumoCreate(nombre="insumo alcohol test", unidad_medida_id=unidad.id)
    with pytest.raises(exceptions.NombreDuplicado):
        services.crear_insumo(db_session, data2)


def test_leer_insumo_inexistente(db_session: Session):
    """Verifica que leer un insumo por ID inexistente lance InsumoNoEncontrado."""
    with pytest.raises(exceptions.InsumoNoEncontrado):
        services.leer_insumo(db_session, 9999)


def test_modificar_insumo_inexistente(db_session: Session):
    """Verifica que modificar un insumo inexistente lance InsumoNoEncontrado."""
    unidad = _crear_unidad_base(db_session)
    update_data = schemas.InsumoUpdate(nombre="insumo test", unidad_medida_id=unidad.id, activo=True)
    with pytest.raises(exceptions.InsumoNoEncontrado):
        services.modificar_insumo(db_session, 9999, update_data)


def test_modificar_insumo_nombre_vacio(db_session: Session):
    """Verifica que actualizar un insumo con nombre "" lance NombreVacio."""
    unidad = _crear_unidad_base(db_session)
    creado = services.crear_insumo(
        db_session,
        schemas.InsumoCreate(nombre="insumo cloro test", unidad_medida_id=unidad.id)
    )
    update_data = schemas.InsumoUpdate(nombre="", unidad_medida_id=unidad.id, activo=True)
    with pytest.raises(exceptions.NombreVacio):
        services.modificar_insumo(db_session, creado.id, update_data)


def test_modificar_insumo_nombre_duplicado(db_session: Session):
    """Verifica que modificar el nombre de un insumo a uno ya existente lance NombreDuplicado."""
    unidad = _crear_unidad_base(db_session)
    i1 = services.crear_insumo(db_session, schemas.InsumoCreate(nombre="insumo a test", unidad_medida_id=unidad.id))
    i2 = services.crear_insumo(db_session, schemas.InsumoCreate(nombre="insumo b test", unidad_medida_id=unidad.id))

    update_data = schemas.InsumoUpdate(nombre="insumo a test", unidad_medida_id=unidad.id, activo=True)
    with pytest.raises(exceptions.NombreDuplicado):
        services.modificar_insumo(db_session, i2.id, update_data)


def test_eliminar_insumo_activo_falla(db_session: Session):
    """Verifica que intentar eliminar físicamente un insumo activo lance HTTP 400."""
    unidad = _crear_unidad_base(db_session)
    creado = services.crear_insumo(
        db_session,
        schemas.InsumoCreate(nombre="insumo activo test", unidad_medida_id=unidad.id, activo=True)
    )

    with pytest.raises(HTTPException) as exc_info:
        services.eliminar_insumo(db_session, creado.id)
    assert exc_info.value.status_code == 400
    assert "activos no se pueden eliminar físicamente" in exc_info.value.detail


def test_eliminar_insumo_inexistente(db_session: Session):
    """Verifica que eliminar un insumo inexistente lance InsumoNoEncontrado."""
    with pytest.raises(exceptions.InsumoNoEncontrado):
        services.eliminar_insumo(db_session, 9999)
