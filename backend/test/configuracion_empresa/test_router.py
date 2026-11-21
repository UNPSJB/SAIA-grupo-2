from fastapi import status
from fastapi.testclient import TestClient

URL = "/configuracion-empresa"

def test_router_get_configuracion_empresa(client: TestClient):
    respuesta = client.get(URL)
    assert respuesta.status_code == status.HTTP_200_OK
    cuerpo = respuesta.json()
    assert "nombre_empresa" in cuerpo
    assert "cuit" in cuerpo

def test_router_put_configuracion_empresa(client: TestClient):
    payload = {
        "nombre_empresa": "SAIA Argentina S.A.",
        "cuit": "30-77777777-7",
        "domicilio": "Av. San Martín 500"
    }
    respuesta = client.put(URL, json=payload)
    assert respuesta.status_code == status.HTTP_200_OK
    cuerpo = respuesta.json()
    assert cuerpo["nombre_empresa"] == "SAIA Argentina S.A."
    assert cuerpo["cuit"] == "30-77777777-7"
    assert cuerpo["domicilio"] == "Av. San Martín 500"
