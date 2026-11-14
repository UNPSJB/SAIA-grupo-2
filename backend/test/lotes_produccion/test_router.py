from datetime import date, timedelta

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.lotes_produccion.constants import ErrorCode
from src.lotes_produccion.models import LoteProduccion
from src.productos.constants import ErrorCode as ErrorCodeProducto
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.unidades_medida.models import UnidadMedida

URL = "/lotes-produccion"
HOY = date.today()


def _crear_producto(db: Session, nombre: str = "Prepizza") -> Producto:
    unidad = db.query(UnidadMedida).first() or UnidadMedida(nombre="Unidades")
    producto = Producto(nombre=nombre, tipo=TipoProducto.ALIMENTO, stock=0, unidad_medida=unidad)
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def _registrar(db: Session, producto: Producto, fecha: date, cantidad: float = 10) -> LoteProduccion:
    lote = LoteProduccion(producto_id=producto.id, fecha=fecha, cantidad=cantidad)
    db.add(lote)
    db.commit()
    db.refresh(lote)
    return lote


def test_router_crear_lote(client: TestClient, db_session: Session):
    producto = _crear_producto(db_session)

    respuesta = client.post(f"{URL}/", json={"producto_id": producto.id, "fecha": str(HOY), "cantidad": 48})

    assert respuesta.status_code == status.HTTP_200_OK
    cuerpo = respuesta.json()
    assert cuerpo["nro_lote"] is not None
    assert cuerpo["fecha"] == str(HOY)
    assert cuerpo["cantidad"] == 48
    assert cuerpo["producto"] == {
        "id": producto.id,
        "nombre": "Prepizza",
        "tipo": "alimento",
        "unidad_medida": {
            "id": producto.unidad_medida_id,
            "nombre": "Unidades",
            "magnitud": "cantidad",
            "factor_base": 1.0,
        },
    }


def test_router_crear_lote_fecha_futura(client: TestClient, db_session: Session):
    producto = _crear_producto(db_session)

    respuesta = client.post(
        f"{URL}/", json={"producto_id": producto.id, "fecha": str(HOY + timedelta(days=1)), "cantidad": 5}
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.FECHA_FUTURA


def test_router_crear_lote_cantidad_cero(client: TestClient, db_session: Session):
    producto = _crear_producto(db_session)

    respuesta = client.post(f"{URL}/", json={"producto_id": producto.id, "fecha": str(HOY), "cantidad": 0})

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.CANTIDAD_INVALIDA


def test_router_crear_lote_producto_inexistente(client: TestClient):
    respuesta = client.post(f"{URL}/", json={"producto_id": 999, "fecha": str(HOY), "cantidad": 5})

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == ErrorCodeProducto.PRODUCTO_NO_ENCONTRADO


def test_router_crear_lote_sin_fecha(client: TestClient, db_session: Session):
    producto = _crear_producto(db_session)

    respuesta = client.post(f"{URL}/", json={"producto_id": producto.id, "cantidad": 5})

    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_router_detalle_lote(client: TestClient, db_session: Session):
    lote = _registrar(db_session, _crear_producto(db_session), HOY, 12)

    respuesta = client.get(f"{URL}/{lote.nro_lote}")

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["cantidad"] == 12
    assert respuesta.json()["producto"]["nombre"] == "Prepizza"


def test_router_detalle_lote_inexistente(client: TestClient):
    respuesta = client.get(f"{URL}/999")

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == ErrorCode.LOTE_NO_ENCONTRADO


def test_router_listar_lotes(client: TestClient, db_session: Session):
    producto = _crear_producto(db_session)
    _registrar(db_session, producto, HOY - timedelta(days=3))
    _registrar(db_session, producto, HOY)

    respuesta = client.get(f"{URL}/")

    assert respuesta.status_code == status.HTTP_200_OK
    assert [lote["fecha"] for lote in respuesta.json()] == [str(HOY), str(HOY - timedelta(days=3))]


def test_router_listar_lotes_con_filtros(client: TestClient, db_session: Session):
    pan = _crear_producto(db_session, "Pan frances")
    prepizza = _crear_producto(db_session, "Prepizza")
    _registrar(db_session, pan, HOY - timedelta(days=2))
    _registrar(db_session, prepizza, HOY - timedelta(days=9))
    buscado = _registrar(db_session, prepizza, HOY - timedelta(days=2))

    respuesta = client.get(
        f"{URL}/",
        params={
            "producto_id": prepizza.id,
            "fecha_desde": str(HOY - timedelta(days=5)),
            "fecha_hasta": str(HOY),
        },
    )

    assert respuesta.status_code == status.HTTP_200_OK
    assert [lote["nro_lote"] for lote in respuesta.json()] == [buscado.nro_lote]


def test_router_listar_lotes_rango_invalido(client: TestClient):
    respuesta = client.get(
        f"{URL}/", params={"fecha_desde": str(HOY), "fecha_hasta": str(HOY - timedelta(days=1))}
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.RANGO_FECHAS_INVALIDO
