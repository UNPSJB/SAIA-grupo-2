from datetime import date, timedelta

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.insumos import exceptions as insumos_exceptions
from src.insumos.models import Insumo
from src.lotes_produccion import exceptions, schemas, services
from src.lotes_produccion.constants import ErrorCode
from src.lotes_produccion.models import LoteProduccion
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.unidades_medida import services as unidades_services
from src.unidades_medida.models import UnidadMedida

URL = "/lotes-produccion"


@pytest.fixture
def unidades(db_session: Session) -> dict:
    unidades_services.crear_catalogo(db_session)
    return {u.nombre: u for u in db_session.query(UnidadMedida).all()}


@pytest.fixture
def producto(db_session: Session, unidades: dict) -> Producto:
    producto = Producto(nombre="Pan", tipo=TipoProducto.ALIMENTO, stock=0, unidad_medida_id=unidades["Unidades"].id)
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


def _insumo(db: Session, nombre: str, unidad: UnidadMedida, stock: float, activo: bool = True) -> Insumo:
    insumo = Insumo(nombre=nombre, unidad_medida_id=unidad.id, cantidad=stock, activo=activo)
    db.add(insumo)
    db.commit()
    db.refresh(insumo)
    return insumo


@pytest.fixture
def harina(db_session: Session, unidades: dict) -> Insumo:
    return _insumo(db_session, "Harina 000", unidades["Kilogramos"], 5000.0)


@pytest.fixture
def aceite(db_session: Session, unidades: dict) -> Insumo:
    return _insumo(db_session, "Aceite de girasol", unidades["Litros"], 2000.0)


def _usado(insumo: Insumo, cantidad: float, unidad: UnidadMedida) -> dict:
    return {"insumo_id": insumo.id, "cantidad_utilizada": cantidad, "unidad_medida_id": unidad.id}


def _crear(db: Session, producto: Producto, *insumos: dict) -> LoteProduccion:
    return services.crear_lote(
        db,
        schemas.LoteProduccionCreate(producto_id=producto.id, fecha=date.today(), cantidad=40, insumos=list(insumos)),
    )


def _stock(db: Session, insumo: Insumo) -> float:
    db.refresh(insumo)
    return insumo.cantidad


def test_crear_lote_sin_insumos(db_session: Session, producto):
    lote = _crear(db_session, producto)

    assert services.listar_insumos_lote(db_session, lote.nro_lote) == []


def test_crear_lote_descuenta_el_consumo_en_unidad_base(db_session: Session, producto, harina, aceite, unidades):
    lote = _crear(
        db_session, producto, _usado(harina, 1.2, unidades["Kilogramos"]), _usado(aceite, 250, unidades["Mililitros"])
    )

    assert _stock(db_session, harina) == 3800.0
    assert _stock(db_session, aceite) == 1750.0
    detalle = services.listar_insumos_lote(db_session, lote.nro_lote)
    assert [(d.nombre, d.cantidad_utilizada, d.unidad_medida, d.magnitud.value) for d in detalle] == [
        ("Aceite de girasol", 250.0, "Mililitros", "volumen"),
        ("Harina 000", 1200.0, "Gramos", "masa"),
    ]


def test_crear_lote_con_stock_justo(db_session: Session, producto, harina, unidades):
    _crear(db_session, producto, _usado(harina, 5, unidades["Kilogramos"]))

    assert _stock(db_session, harina) == 0.0


def _sin_cambios(db: Session, harina: Insumo, aceite: Insumo) -> None:
    assert db.query(LoteProduccion).count() == 0
    assert _stock(db, harina) == 5000.0
    assert _stock(db, aceite) == 2000.0


def test_stock_insuficiente_no_guarda_nada(db_session: Session, producto, harina, aceite, unidades):
    with pytest.raises(exceptions.StockInsuficiente):
        _crear(
            db_session,
            producto,
            _usado(aceite, 100, unidades["Mililitros"]),
            _usado(harina, 5000.01, unidades["Gramos"]),
        )

    _sin_cambios(db_session, harina, aceite)


def test_unidad_de_otra_magnitud_no_guarda_nada(db_session: Session, producto, harina, aceite, unidades):
    with pytest.raises(insumos_exceptions.UnidadIncompatible):
        _crear(db_session, producto, _usado(aceite, 1, unidades["Litros"]), _usado(harina, 100, unidades["Mililitros"]))

    _sin_cambios(db_session, harina, aceite)


@pytest.mark.parametrize("cantidad", [0, -5])
def test_consumo_no_positivo(db_session: Session, producto, harina, aceite, unidades, cantidad):
    with pytest.raises(insumos_exceptions.CantidadInvalida):
        _crear(db_session, producto, _usado(harina, cantidad, unidades["Gramos"]))

    _sin_cambios(db_session, harina, aceite)


def test_insumo_repetido(db_session: Session, producto, harina, aceite, unidades):
    with pytest.raises(exceptions.InsumoRepetido):
        _crear(db_session, producto, _usado(harina, 1, unidades["Gramos"]), _usado(harina, 2, unidades["Gramos"]))

    _sin_cambios(db_session, harina, aceite)


def test_insumo_inactivo(db_session: Session, producto, harina, aceite, unidades):
    grasa = _insumo(db_session, "Grasa", unidades["Kilogramos"], 1000.0, activo=False)

    with pytest.raises(exceptions.InsumoInactivo):
        _crear(db_session, producto, _usado(grasa, 100, unidades["Gramos"]))

    _sin_cambios(db_session, harina, aceite)


def test_insumo_inexistente(db_session: Session, producto, harina, aceite, unidades):
    with pytest.raises(exceptions.InsumoNoEncontrado):
        _crear(db_session, producto, {"insumo_id": 999, "cantidad_utilizada": 1, "unidad_medida_id": unidades["Gramos"].id})

    _sin_cambios(db_session, harina, aceite)


def test_fecha_futura_no_descuenta_stock(db_session: Session, producto, harina, aceite, unidades):
    with pytest.raises(exceptions.FechaFutura):
        services.crear_lote(
            db_session,
            schemas.LoteProduccionCreate(
                producto_id=producto.id,
                fecha=date.today() + timedelta(days=1),
                cantidad=10,
                insumos=[_usado(harina, 1, unidades["Kilogramos"])],
            ),
        )

    _sin_cambios(db_session, harina, aceite)


def test_listar_insumos_de_lote_inexistente(db_session: Session):
    with pytest.raises(exceptions.LoteNoEncontrado):
        services.listar_insumos_lote(db_session, 999)


def test_router_crear_lote_con_insumos_y_consultarlos(client: TestClient, producto, harina, unidades):
    respuesta = client.post(
        f"{URL}/",
        json={
            "producto_id": producto.id,
            "fecha": str(date.today()),
            "cantidad": 12,
            "insumos": [_usado(harina, 2, unidades["Kilogramos"])],
        },
    )

    assert respuesta.status_code == status.HTTP_200_OK
    nro_lote = respuesta.json()["nro_lote"]
    assert client.get(f"{URL}/{nro_lote}/insumos").json() == [
        {"insumo_id": harina.id, "nombre": "Harina 000", "cantidad_utilizada": 2000.0, "unidad_medida": "Gramos", "magnitud": "masa"}
    ]
    assert client.get(f"/insumos/{harina.id}").json()["cantidad"] == 3000.0


def test_router_stock_insuficiente(client: TestClient, producto, harina, unidades):
    respuesta = client.post(
        f"{URL}/",
        json={
            "producto_id": producto.id,
            "fecha": str(date.today()),
            "cantidad": 12,
            "insumos": [_usado(harina, 6, unidades["Kilogramos"])],
        },
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.STOCK_INSUFICIENTE
    assert client.get(f"{URL}/").json() == []


def test_router_no_permite_modificar_insumos_de_un_lote(client: TestClient, producto, harina, unidades):
    lote = client.post(f"{URL}/", json={"producto_id": producto.id, "fecha": str(date.today()), "cantidad": 1}).json()
    url = f"{URL}/{lote['nro_lote']}/insumos"

    agregar = client.post(url, json=_usado(harina, 1, unidades["Gramos"]))
    quitar = client.delete(f"{url}/{harina.id}")

    assert agregar.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
    assert quitar.status_code == status.HTTP_404_NOT_FOUND
