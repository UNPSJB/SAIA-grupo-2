from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.alimentos_referencia.constants import ErrorCode
from src.alimentos_referencia.models import AlimentoReferencia
from src.unidades_medida.constants import MagnitudUnidad

URL = "/alimentos-referencia"


def _crear(db: Session, codigo: str, nombre: str, **valores) -> AlimentoReferencia:
    alimento = AlimentoReferencia(
        codigo=codigo,
        nombre=nombre,
        nombre_busqueda=nombre.lower(),
        magnitud=MagnitudUnidad.MASA,
        **valores,
    )
    db.add(alimento)
    db.commit()
    return alimento


def test_router_buscar_alimentos(client: TestClient, db_session: Session):
    _crear(db_session, "A010", "Harina de trigo", energia=349.97, sodio=2.0)
    _crear(db_session, "D003", "Azucar blanca molida", energia=399.92)

    respuesta = client.get(f"{URL}/", params={"busqueda": "harina"})

    assert respuesta.status_code == status.HTTP_200_OK
    cuerpo = respuesta.json()
    assert len(cuerpo) == 1
    assert cuerpo[0]["codigo"] == "A010"
    assert cuerpo[0]["magnitud"] == "masa"
    assert cuerpo[0]["energia"] == 349.97
    assert cuerpo[0]["azucares_totales"] is None


def test_router_buscar_limite_invalido(client: TestClient):
    assert client.get(f"{URL}/", params={"limite": 0}).status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert client.get(f"{URL}/", params={"limite": 51}).status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_router_detalle_alimento(client: TestClient, db_session: Session):
    _crear(db_session, "A010", "Harina de trigo", sodio=2.0)

    respuesta = client.get(f"{URL}/A010")

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["sodio"] == 2.0


def test_router_detalle_alimento_inexistente(client: TestClient):
    respuesta = client.get(f"{URL}/Z999")

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == ErrorCode.ALIMENTO_NO_ENCONTRADO
