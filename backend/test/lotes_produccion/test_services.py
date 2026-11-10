from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from src.lotes_produccion import exceptions, schemas, services
from src.lotes_produccion.models import LoteProduccion
from src.productos.constants import TipoProducto
from src.productos.exceptions import ProductoNoEncontrado
from src.productos.models import Producto
from src.unidades_medida.models import UnidadMedida

HOY = date.today()


@pytest.fixture
def producto(db_session: Session) -> Producto:
    unidad = UnidadMedida(nombre="Kilogramos")
    producto = Producto(nombre="Pan frances", tipo=TipoProducto.ALIMENTO, stock=0, unidad_medida=unidad)
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


def _crear_producto(db: Session, unidad_id: int, nombre: str) -> Producto:
    producto = Producto(nombre=nombre, tipo=TipoProducto.ALIMENTO, stock=0, unidad_medida_id=unidad_id)
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def _registrar(db: Session, producto: Producto, dias_atras: int, cantidad: float = 10) -> LoteProduccion:
    lote = LoteProduccion(producto_id=producto.id, fecha=HOY - timedelta(days=dias_atras), cantidad=cantidad)
    db.add(lote)
    db.commit()
    db.refresh(lote)
    return lote


def test_crear_lote(db_session: Session, producto: Producto):
    lote = services.crear_lote(
        db_session, schemas.LoteProduccionCreate(producto_id=producto.id, fecha=HOY, cantidad=25.5)
    )

    assert lote.nro_lote is not None
    assert lote.producto.nombre == "Pan frances"
    assert lote.fecha == HOY
    assert lote.cantidad == 25.5


def test_crear_lote_numera_en_forma_correlativa(db_session: Session, producto: Producto):
    primero = services.crear_lote(
        db_session, schemas.LoteProduccionCreate(producto_id=producto.id, fecha=HOY, cantidad=1)
    )
    segundo = services.crear_lote(
        db_session, schemas.LoteProduccionCreate(producto_id=producto.id, fecha=HOY, cantidad=1)
    )

    assert segundo.nro_lote == primero.nro_lote + 1


def test_crear_lote_con_fecha_pasada(db_session: Session, producto: Producto):
    ayer = HOY - timedelta(days=1)

    lote = services.crear_lote(db_session, schemas.LoteProduccionCreate(producto_id=producto.id, fecha=ayer, cantidad=3))

    assert lote.fecha == ayer


def test_crear_lote_con_fecha_futura(db_session: Session, producto: Producto):
    manana = HOY + timedelta(days=1)

    with pytest.raises(exceptions.FechaFutura):
        services.crear_lote(db_session, schemas.LoteProduccionCreate(producto_id=producto.id, fecha=manana, cantidad=3))


@pytest.mark.parametrize("cantidad", [0, -5])
def test_crear_lote_con_cantidad_no_positiva(db_session: Session, producto: Producto, cantidad: float):
    with pytest.raises(exceptions.CantidadInvalida):
        services.crear_lote(
            db_session, schemas.LoteProduccionCreate(producto_id=producto.id, fecha=HOY, cantidad=cantidad)
        )


def test_crear_lote_con_producto_inexistente(db_session: Session):
    with pytest.raises(ProductoNoEncontrado):
        services.crear_lote(db_session, schemas.LoteProduccionCreate(producto_id=999, fecha=HOY, cantidad=3))


def test_crear_lote_no_modifica_el_stock_del_producto(db_session: Session, producto: Producto):
    services.crear_lote(db_session, schemas.LoteProduccionCreate(producto_id=producto.id, fecha=HOY, cantidad=30))

    db_session.refresh(producto)
    assert producto.stock == 0


def test_leer_lote(db_session: Session, producto: Producto):
    lote = _registrar(db_session, producto, 0, 7)

    assert services.leer_lote(db_session, lote.nro_lote).cantidad == 7


def test_leer_lote_inexistente(db_session: Session):
    with pytest.raises(exceptions.LoteNoEncontrado):
        services.leer_lote(db_session, 999)


def test_listar_lotes_del_mas_reciente_al_mas_antiguo(db_session: Session, producto: Producto):
    antiguo = _registrar(db_session, producto, 10)
    reciente = _registrar(db_session, producto, 0)
    mismo_dia = _registrar(db_session, producto, 0)

    lotes = services.listar_lotes(db_session)

    assert [lote.nro_lote for lote in lotes] == [mismo_dia.nro_lote, reciente.nro_lote, antiguo.nro_lote]


def test_listar_lotes_por_producto(db_session: Session, producto: Producto):
    otro = _crear_producto(db_session, producto.unidad_medida_id, "Prepizza")
    _registrar(db_session, producto, 1)
    buscado = _registrar(db_session, otro, 1)

    lotes = services.listar_lotes(db_session, producto_id=otro.id)

    assert [lote.nro_lote for lote in lotes] == [buscado.nro_lote]


def test_listar_lotes_por_rango_incluye_los_extremos(db_session: Session, producto: Producto):
    _registrar(db_session, producto, 10)
    desde = _registrar(db_session, producto, 7)
    medio = _registrar(db_session, producto, 5)
    hasta = _registrar(db_session, producto, 3)
    _registrar(db_session, producto, 0)

    lotes = services.listar_lotes(
        db_session, fecha_desde=HOY - timedelta(days=7), fecha_hasta=HOY - timedelta(days=3)
    )

    assert [lote.nro_lote for lote in lotes] == [hasta.nro_lote, medio.nro_lote, desde.nro_lote]


def test_listar_lotes_combina_producto_y_fechas(db_session: Session, producto: Producto):
    otro = _crear_producto(db_session, producto.unidad_medida_id, "Prepizza")
    _registrar(db_session, producto, 2)
    _registrar(db_session, otro, 8)
    buscado = _registrar(db_session, otro, 2)

    lotes = services.listar_lotes(db_session, producto_id=otro.id, fecha_desde=HOY - timedelta(days=4))

    assert [lote.nro_lote for lote in lotes] == [buscado.nro_lote]


def test_listar_lotes_rango_invalido(db_session: Session):
    with pytest.raises(exceptions.RangoFechasInvalido):
        services.listar_lotes(db_session, fecha_desde=HOY, fecha_hasta=HOY - timedelta(days=1))
