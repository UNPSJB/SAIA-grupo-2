from fastapi.testclient import TestClient

def test_router_get_configuracion(client: TestClient):
    response = client.get("/vista-publica/configuracion")
    assert response.status_code == 200
    data = response.json()
    assert "activa" in data
    assert "fecha_activacion" in data
    assert "token" in data
    assert data["activa"] is False
    assert data["fecha_activacion"] is None
    assert data["token"] is not None

def test_router_put_configuracion_activar(client: TestClient):
    payload = {"activa": True}
    response = client.put("/vista-publica/configuracion", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["activa"] is True
    assert data["fecha_activacion"] is not None
    assert data["token"] is not None

def test_router_put_configuracion_desactivar(client: TestClient):
    payload = {"activa": False}
    response = client.put("/vista-publica/configuracion", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["activa"] is False
    assert data["fecha_activacion"] is None

def test_router_put_configuracion_payload_invalido(client: TestClient):
    payload = {"estado_incorrecto": "activo"}
    response = client.put("/vista-publica/configuracion", json=payload)
    assert response.status_code == 422
