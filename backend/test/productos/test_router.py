from datetime import date

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.lotes_produccion.models import LoteProduccion
from src.productos.constants import ErrorCode, TipoProducto
from src.productos.models import Producto
from src.unidades_medida.models import UnidadMedida

URL = "/productos"


def _crear_unidad(db: Session, nombre: str = "Unidades") -> UnidadMedida:
    unidad = UnidadMedida(nombre=nombre)
    db.add(unidad)
    db.commit()
    db.refresh(unidad)
    return unidad


def _crear_producto(db: Session, unidad: UnidadMedida, nombre: str = "Prepizza") -> Producto:
    producto = Producto(nombre=nombre, tipo=TipoProducto.ALIMENTO, stock=4, unidad_medida_id=unidad.id)
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def test_router_crear_producto(client: TestClient, db_session: Session):
    unidad = _crear_unidad(db_session)

    respuesta = client.post(
        f"{URL}/",
        json={"nombre": "Medialunas", "tipo": "alimento", "stock": 24, "unidad_medida_id": unidad.id},
    )

    assert respuesta.status_code == status.HTTP_200_OK
    cuerpo = respuesta.json()
    assert cuerpo["nombre"] == "Medialunas"
    assert cuerpo["tipo"] == "alimento"
    assert cuerpo["stock"] == 24
    assert cuerpo["unidad_medida"] == {"id": unidad.id, "nombre": "Unidades", "magnitud": "cantidad", "factor_base": 1.0}


def test_router_crear_producto_stock_por_defecto(client: TestClient, db_session: Session):
    unidad = _crear_unidad(db_session)

    respuesta = client.post(f"{URL}/", json={"nombre": "Jugo", "tipo": "bebida", "unidad_medida_id": unidad.id})

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["stock"] == 0


def test_router_crear_producto_duplicado(client: TestClient, db_session: Session):
    unidad = _crear_unidad(db_session)
    _crear_producto(db_session, unidad, "Prepizza")

    respuesta = client.post(
        f"{URL}/", json={"nombre": "prepizza", "tipo": "alimento", "stock": 0, "unidad_medida_id": unidad.id}
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.NOMBRE_DUPLICADO


def test_router_crear_producto_stock_negativo(client: TestClient, db_session: Session):
    unidad = _crear_unidad(db_session)

    respuesta = client.post(
        f"{URL}/", json={"nombre": "Prepizza", "tipo": "alimento", "stock": -2, "unidad_medida_id": unidad.id}
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.STOCK_NEGATIVO


def test_router_crear_producto_nombre_vacio(client: TestClient, db_session: Session):
    unidad = _crear_unidad(db_session)

    respuesta = client.post(f"{URL}/", json={"nombre": "   ", "tipo": "alimento", "unidad_medida_id": unidad.id})

    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_router_crear_producto_tipo_invalido(client: TestClient, db_session: Session):
    unidad = _crear_unidad(db_session)

    respuesta = client.post(f"{URL}/", json={"nombre": "Prepizza", "tipo": "otro", "unidad_medida_id": unidad.id})

    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_router_listar_productos(client: TestClient, db_session: Session):
    unidad = _crear_unidad(db_session)
    _crear_producto(db_session, unidad, "Prepizza")
    _crear_producto(db_session, unidad, "Medialunas")

    respuesta = client.get(f"{URL}/")

    assert respuesta.status_code == status.HTTP_200_OK
    assert [producto["nombre"] for producto in respuesta.json()] == ["Medialunas", "Prepizza"]


def test_router_detalle_producto(client: TestClient, db_session: Session):
    producto = _crear_producto(db_session, _crear_unidad(db_session))

    respuesta = client.get(f"{URL}/{producto.id}")

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["nombre"] == "Prepizza"


def test_router_detalle_producto_inexistente(client: TestClient):
    respuesta = client.get(f"{URL}/999")

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == ErrorCode.PRODUCTO_NO_ENCONTRADO


def test_router_modificar_producto(client: TestClient, db_session: Session):
    unidad = _crear_unidad(db_session)
    producto = _crear_producto(db_session, unidad)

    respuesta = client.put(
        f"{URL}/{producto.id}",
        json={"nombre": "Prepizza grande", "tipo": "alimento", "stock": 40, "unidad_medida_id": unidad.id},
    )

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["nombre"] == "Prepizza grande"
    assert respuesta.json()["stock"] == 40


def test_router_modificar_producto_inexistente(client: TestClient, db_session: Session):
    unidad = _crear_unidad(db_session)

    respuesta = client.put(
        f"{URL}/999", json={"nombre": "Prepizza", "tipo": "alimento", "stock": 0, "unidad_medida_id": unidad.id}
    )

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND


def test_router_lotes_de_producto(client: TestClient, db_session: Session):
    producto = _crear_producto(db_session, _crear_unidad(db_session))
    db_session.add(LoteProduccion(producto_id=producto.id, fecha=date(2026, 6, 1), cantidad=30))
    db_session.commit()

    respuesta = client.get(f"{URL}/{producto.id}/lotes")

    assert respuesta.status_code == status.HTTP_200_OK
    lotes = respuesta.json()
    assert len(lotes) == 1
    assert lotes[0]["fecha"] == "2026-06-01"
    assert lotes[0]["cantidad"] == 30
    assert lotes[0]["producto"]["nombre"] == "Prepizza"


def test_router_lotes_de_producto_inexistente(client: TestClient):
    respuesta = client.get(f"{URL}/999/lotes")

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
