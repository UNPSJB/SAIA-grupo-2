from fastapi import status
from fastapi.testclient import TestClient

from src.datos_nutricionales.constants import ErrorCode


def _url(insumo_id: int) -> str:
    return f"/insumos/{insumo_id}/datos-nutricionales"


def test_router_cargar_y_leer_datos(client: TestClient, insumo, admin, harina_sara):
    respuesta = client.put(
        _url(insumo.id),
        json={
            "empleado_id": admin.id,
            "datos": [
                {"nutriente": "energia", "valor": 349.97, "fuente": "sara", "alimento_codigo": "A010"},
                {"nutriente": "azucares_totales", "valor": 0.3, "fuente": "rotulo_proveedor", "referencia": " Marca A "},
            ],
        },
    )

    assert respuesta.status_code == status.HTTP_200_OK
    cuerpo = respuesta.json()
    assert cuerpo["insumo"] == {"id": insumo.id, "nombre": "Harina 000", "activo": True, "magnitud": "masa"}
    energia, azucares = cuerpo["datos"]
    assert energia["nutriente"] == "energia"
    assert energia["unidad"] == "kcal"
    assert energia["alimento"] == {
        "codigo": "A010",
        "nombre": "Harina de Trigo",
        "magnitud": "masa",
        "nombre_en_pdf": None,
    }
    assert energia["cargado_por"]["legajo"] == "EMP-9001"
    assert azucares["referencia"] == "Marca A"
    assert azucares["unidad"] == "g"

    lectura = client.get(_url(insumo.id))
    assert lectura.status_code == status.HTTP_200_OK
    assert lectura.json() == cuerpo


def test_router_leer_insumo_sin_datos(client: TestClient, insumo):
    respuesta = client.get(_url(insumo.id))

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["datos"] == []


def test_router_insumo_inexistente(client: TestClient):
    assert client.get(_url(999)).status_code == status.HTTP_404_NOT_FOUND


def test_router_valor_negativo(client: TestClient, insumo, admin):
    respuesta = client.put(
        _url(insumo.id),
        json={"empleado_id": admin.id, "datos": [{"nutriente": "sodio", "valor": -1, "fuente": "valor_propio"}]},
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.VALOR_NEGATIVO


def test_router_sara_sin_referencia(client: TestClient, insumo, admin):
    respuesta = client.put(
        _url(insumo.id),
        json={"empleado_id": admin.id, "datos": [{"nutriente": "sodio", "valor": 1, "fuente": "sara"}]},
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.REFERENCIA_OBLIGATORIA


def test_router_nutriente_o_fuente_invalidos(client: TestClient, insumo, admin):
    nutriente = client.put(
        _url(insumo.id),
        json={"empleado_id": admin.id, "datos": [{"nutriente": "calcio", "valor": 1, "fuente": "valor_propio"}]},
    )
    fuente = client.put(
        _url(insumo.id),
        json={"empleado_id": admin.id, "datos": [{"nutriente": "sodio", "valor": 1, "fuente": "internet"}]},
    )

    assert nutriente.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert fuente.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_router_carga_vacia(client: TestClient, insumo, admin):
    respuesta = client.put(_url(insumo.id), json={"empleado_id": admin.id, "datos": []})

    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_router_resumen(client: TestClient, insumo, admin):
    client.put(
        _url(insumo.id),
        json={"empleado_id": admin.id, "datos": [{"nutriente": "sodio", "valor": 2, "fuente": "bibliografia"}]},
    )

    respuesta = client.get("/datos-nutricionales/")

    assert respuesta.status_code == status.HTTP_200_OK
    item = respuesta.json()[0]
    assert item["insumo"]["nombre"] == "Harina 000"
    assert (item["cargados"], item["total"], item["fuentes"]) == (1, 10, ["bibliografia"])
