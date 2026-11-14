from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.unidades_medida import services
from src.unidades_medida.constants import ErrorCode

URL = "/unidades_medida"


def test_router_listar_unidades_medida(client: TestClient, db_session: Session):
    services.crear_catalogo(db_session)

    respuesta = client.get(f"{URL}/")

    assert respuesta.status_code == status.HTTP_200_OK
    cuerpo = respuesta.json()
    assert [u["nombre"] for u in cuerpo] == ["Gramos", "Kilogramos", "Mililitros", "Litros", "Unidades"]
    assert cuerpo[3] == {"id": cuerpo[3]["id"], "nombre": "Litros", "magnitud": "volumen", "factor_base": 1000.0}


def test_router_leer_unidad_medida(client: TestClient, db_session: Session):
    services.crear_catalogo(db_session)
    gramos = services.listar_unidades_medida(db_session)[0]

    respuesta = client.get(f"{URL}/{gramos.id}")

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["magnitud"] == "masa"


def test_router_leer_unidad_medida_inexistente(client: TestClient):
    respuesta = client.get(f"{URL}/999")

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == ErrorCode.UNIDAD_MEDIDA_NO_ENCONTRADA


def test_router_no_permite_crear_modificar_ni_borrar(client: TestClient):
    assert client.post(f"{URL}/", json={"nombre": "Pallets"}).status_code == status.HTTP_405_METHOD_NOT_ALLOWED
    assert client.put(f"{URL}/1", json={"nombre": "Pallets"}).status_code == status.HTTP_405_METHOD_NOT_ALLOWED
    assert client.delete(f"{URL}/1").status_code == status.HTTP_405_METHOD_NOT_ALLOWED
