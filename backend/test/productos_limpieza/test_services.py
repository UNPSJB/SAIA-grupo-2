
import pytest
from fastapi import HTTPException

from src.productos_limpieza import services, schemas, exceptions
from src.productos_limpieza.constants import TipoProductoLimpieza
from src.productos_limpieza.models import ProductoLimpieza
from src.unidades_medida.models import UnidadMedida


@pytest.fixture
def unidad_medida(db_session):
    """Crea una unidad de medida para los productos de prueba."""
    unidad = UnidadMedida(nombre="Litro")
    db_session.add(unidad)
    db_session.commit()
    db_session.refresh(unidad)
    return unidad


def crear_producto_prueba(db_session, unidad_medida, **cambios):
    datos = {
        "nombre": "Detergente de prueba",
        "tipo": TipoProductoLimpieza.DETERGENTE,
        "stock": 10.0,
        "unidad_medida_id": unidad_medida.id,
        "activo": True,
    }
    datos.update(cambios)

    producto = ProductoLimpieza(**datos)
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


def test_crear_producto_exito(db_session, unidad_medida):
    payload = schemas.ProductoLimpiezaCreate(
        nombre="Desinfectante",
        tipo=TipoProductoLimpieza.DESINFECTANTE,
        stock=5.0,
        unidad_medida_id=unidad_medida.id,
    )

    producto = services.crear_producto(db_session, payload)

    assert producto.id is not None
    assert producto.nombre == "Desinfectante"
    assert producto.tipo == TipoProductoLimpieza.DESINFECTANTE
    assert producto.stock == 5.0
    assert producto.unidad_medida_id == unidad_medida.id


def test_crear_producto_nombre_duplicado(db_session, unidad_medida):
    crear_producto_prueba(db_session, unidad_medida, nombre="Detergente")

    payload = schemas.ProductoLimpiezaCreate(
        nombre="Detergente",
        tipo=TipoProductoLimpieza.DETERGENTE,
        stock=2.0,
        unidad_medida_id=unidad_medida.id,
    )

    with pytest.raises(exceptions.NombreDuplicado):
        services.crear_producto(db_session, payload)


def test_listar_productos(db_session, unidad_medida):
    crear_producto_prueba(db_session, unidad_medida, nombre="Detergente")
    crear_producto_prueba(db_session, unidad_medida, nombre="Desinfectante")

    productos = services.listar_productos(db_session)

    assert len(productos) == 2
    assert {p.nombre for p in productos} == {"Detergente", "Desinfectante"}


def test_listar_productos_con_stock(db_session, unidad_medida):
    crear_producto_prueba(
        db_session, unidad_medida, nombre="Con stock", stock=5.0
    )
    crear_producto_prueba(
        db_session, unidad_medida, nombre="Sin stock", stock=0.0
    )

    productos = services.listar_productos_con_stock(db_session)

    assert len(productos) == 1
    assert productos[0].nombre == "Con stock"


def test_leer_producto_exito(db_session, unidad_medida):
    producto = crear_producto_prueba(db_session, unidad_medida)

    resultado = services.leer_producto(db_session, producto.id)

    assert resultado.id == producto.id
    assert resultado.nombre == producto.nombre


def test_leer_producto_inexistente(db_session):
    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.leer_producto(db_session, 9999)


def test_modificar_producto_exito(db_session, unidad_medida):
    producto = crear_producto_prueba(db_session, unidad_medida)

    payload = schemas.ProductoLimpiezaUpdate(
        nombre="Detergente modificado",
        tipo=TipoProductoLimpieza.DESENGRASANTE,
        stock=20.0,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )

    resultado = services.modificar_producto(db_session, producto.id, payload)

    assert resultado.nombre == "Detergente modificado"
    assert resultado.tipo == TipoProductoLimpieza.DESENGRASANTE
    assert resultado.stock == 20.0


def test_modificar_producto_nombre_duplicado(db_session, unidad_medida):
    crear_producto_prueba(db_session, unidad_medida, nombre="Detergente")
    otro = crear_producto_prueba(
        db_session, unidad_medida, nombre="Desinfectante"
    )

    payload = schemas.ProductoLimpiezaUpdate(
        nombre="Detergente",
        tipo=TipoProductoLimpieza.DESINFECTANTE,
        stock=3.0,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )

    with pytest.raises(exceptions.NombreDuplicado):
        services.modificar_producto(db_session, otro.id, payload)


def test_modificar_producto_inexistente(db_session, unidad_medida):
    payload = schemas.ProductoLimpiezaUpdate(
        nombre="Producto nuevo",
        tipo=TipoProductoLimpieza.DETERGENTE,
        stock=1.0,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )

    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.modificar_producto(db_session, 9999, payload)


def test_descontar_stock_exito(db_session, unidad_medida):
    producto = crear_producto_prueba(db_session, unidad_medida, stock=10.0)

    resultado = services.descontar_stock(db_session, producto.id, 3.5)

    assert resultado.stock == pytest.approx(6.5)


def test_descontar_stock_negativo(db_session, unidad_medida):
    producto = crear_producto_prueba(db_session, unidad_medida, stock=2.0)

    with pytest.raises(exceptions.StockNegativo):
        services.descontar_stock(db_session, producto.id, 3.0)


def test_descontar_stock_producto_inexistente(db_session):
    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.descontar_stock(db_session, 9999, 1.0)


def test_eliminar_producto_activo(db_session, unidad_medida):
    producto = crear_producto_prueba(db_session, unidad_medida, activo=True)

    with pytest.raises(HTTPException) as error:
        services.eliminar_producto(db_session, producto.id)

    assert error.value.status_code == 400
    assert "activos no se pueden eliminar físicamente" in error.value.detail


def test_eliminar_producto_inexistente(db_session):
    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.eliminar_producto(db_session, 9999)


def test_eliminar_producto_inactivo(db_session, unidad_medida):
    producto = crear_producto_prueba(db_session, unidad_medida, activo=False)

    resultado = services.eliminar_producto(db_session, producto.id)

    assert resultado == {"id": producto.id, "msg": "borrado"}
    assert db_session.get(ProductoLimpieza, producto.id) is None
