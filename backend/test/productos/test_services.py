from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from src.lotes_produccion.models import LoteProduccion
from src.productos import exceptions, schemas, services
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.unidades_medida.exceptions import UnidadMedidaNoEncontrada
from src.unidades_medida.models import UnidadMedida


@pytest.fixture
def unidad(db_session: Session) -> UnidadMedida:
    unidad = UnidadMedida(nombre="Kilogramos")
    db_session.add(unidad)
    db_session.commit()
    db_session.refresh(unidad)
    return unidad


def _crear_producto(db: Session, unidad: UnidadMedida, **cambios) -> Producto:
    datos = {"nombre": "Pan frances", "tipo": TipoProducto.ALIMENTO, "stock": 10.0, "unidad_medida_id": unidad.id}
    datos.update(cambios)
    producto = Producto(**datos)
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def _payload(unidad: UnidadMedida, **cambios) -> dict:
    datos = {"nombre": "Pan lactal", "tipo": TipoProducto.ALIMENTO, "stock": 0, "unidad_medida_id": unidad.id}
    datos.update(cambios)
    return datos


def test_crear_producto(db_session: Session, unidad: UnidadMedida):
    producto = services.crear_producto(db_session, schemas.ProductoCreate(**_payload(unidad, stock=12.5)))

    assert producto.id is not None
    assert producto.nombre == "Pan lactal"
    assert producto.tipo == TipoProducto.ALIMENTO
    assert producto.stock == 12.5
    assert producto.unidad_medida.nombre == "Kilogramos"


def test_crear_producto_quita_espacios_del_nombre(db_session: Session, unidad: UnidadMedida):
    producto = services.crear_producto(db_session, schemas.ProductoCreate(**_payload(unidad, nombre="  Prepizza  ")))

    assert producto.nombre == "Prepizza"


def test_crear_producto_nombre_duplicado_sin_importar_mayusculas(db_session: Session, unidad: UnidadMedida):
    _crear_producto(db_session, unidad, nombre="Pan frances")

    with pytest.raises(exceptions.NombreDuplicado):
        services.crear_producto(db_session, schemas.ProductoCreate(**_payload(unidad, nombre="PAN FRANCES")))


def test_crear_producto_stock_negativo(db_session: Session, unidad: UnidadMedida):
    with pytest.raises(exceptions.StockNegativo):
        services.crear_producto(db_session, schemas.ProductoCreate(**_payload(unidad, stock=-1)))


def test_crear_producto_unidad_inexistente(db_session: Session, unidad: UnidadMedida):
    with pytest.raises(UnidadMedidaNoEncontrada):
        services.crear_producto(db_session, schemas.ProductoCreate(**_payload(unidad, unidad_medida_id=999)))


def test_listar_productos_ordenados_por_nombre(db_session: Session, unidad: UnidadMedida):
    _crear_producto(db_session, unidad, nombre="Prepizza")
    _crear_producto(db_session, unidad, nombre="Medialunas")
    _crear_producto(db_session, unidad, nombre="Jugo de naranja", tipo=TipoProducto.BEBIDA)

    nombres = [producto.nombre for producto in services.listar_productos(db_session)]

    assert nombres == ["Jugo de naranja", "Medialunas", "Prepizza"]


def test_leer_producto_inexistente(db_session: Session):
    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.leer_producto(db_session, 999)


def test_modificar_producto(db_session: Session, unidad: UnidadMedida):
    producto = _crear_producto(db_session, unidad)
    litros = UnidadMedida(nombre="Litros")
    db_session.add(litros)
    db_session.commit()

    modificado = services.modificar_producto(
        db_session,
        producto.id,
        schemas.ProductoUpdate(nombre="Jugo de naranja", tipo=TipoProducto.BEBIDA, stock=3, unidad_medida_id=litros.id),
    )

    assert modificado.nombre == "Jugo de naranja"
    assert modificado.tipo == TipoProducto.BEBIDA
    assert modificado.stock == 3
    assert modificado.unidad_medida.nombre == "Litros"


def test_modificar_producto_puede_conservar_su_nombre(db_session: Session, unidad: UnidadMedida):
    producto = _crear_producto(db_session, unidad, nombre="Pan frances")

    modificado = services.modificar_producto(
        db_session, producto.id, schemas.ProductoUpdate(**_payload(unidad, nombre="Pan frances", stock=50))
    )

    assert modificado.stock == 50


def test_modificar_producto_nombre_de_otro_producto(db_session: Session, unidad: UnidadMedida):
    _crear_producto(db_session, unidad, nombre="Pan frances")
    producto = _crear_producto(db_session, unidad, nombre="Prepizza")

    with pytest.raises(exceptions.NombreDuplicado):
        services.modificar_producto(
            db_session, producto.id, schemas.ProductoUpdate(**_payload(unidad, nombre="pan frances"))
        )


def test_modificar_producto_stock_negativo(db_session: Session, unidad: UnidadMedida):
    producto = _crear_producto(db_session, unidad)

    with pytest.raises(exceptions.StockNegativo):
        services.modificar_producto(db_session, producto.id, schemas.ProductoUpdate(**_payload(unidad, stock=-0.5)))


def test_modificar_producto_inexistente(db_session: Session, unidad: UnidadMedida):
    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.modificar_producto(db_session, 999, schemas.ProductoUpdate(**_payload(unidad)))


def test_lotes_de_producto_del_mas_reciente_al_mas_antiguo(db_session: Session, unidad: UnidadMedida):
    producto = _crear_producto(db_session, unidad)
    otro = _crear_producto(db_session, unidad, nombre="Prepizza")
    hoy = date.today()
    db_session.add_all(
        [
            LoteProduccion(producto_id=producto.id, fecha=hoy - timedelta(days=5), cantidad=10),
            LoteProduccion(producto_id=producto.id, fecha=hoy, cantidad=20),
            LoteProduccion(producto_id=otro.id, fecha=hoy, cantidad=99),
            LoteProduccion(producto_id=producto.id, fecha=hoy - timedelta(days=1), cantidad=30),
        ]
    )
    db_session.commit()

    lotes = services.listar_lotes_de_producto(db_session, producto.id)

    assert [lote.cantidad for lote in lotes] == [20, 30, 10]


def test_lotes_de_producto_inexistente(db_session: Session):
    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.listar_lotes_de_producto(db_session, 999)
