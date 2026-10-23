import pytest
from fastapi.testclient import TestClient


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - ROUTER)
def test_router_crear_capacidad_exito(client: TestClient):
    """POST /capacidades/ debe dar 200 OK y devolver la capacidad creada."""
    payload = {"nombre": "Calibracion Test"}
    response = client.post("/capacidades/", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["nombre"] == "calibracion test"
    assert data["empleados"] == []


def test_router_listar_capacidades(client: TestClient):
    """GET /capacidades/ debe dar 200 OK y devolver el listado."""
    client.post("/capacidades/", json={"nombre": "capacidad 1"})
    client.post("/capacidades/", json={"nombre": "capacidad 2"})

    response = client.get("/capacidades/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_router_read_capacidad_exito(client: TestClient):
    """GET /capacidades/{id} debe dar 200 OK con los datos de la capacidad."""
    res_crear = client.post("/capacidades/", json={"nombre": "inspector test"})
    cap_id = res_crear.json()["id"]

    response = client.get(f"/capacidades/{cap_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == cap_id
    assert data["nombre"] == "inspector test"


def test_router_update_capacidad_exito(client: TestClient):
    """PUT /capacidades/{id} debe dar 200 OK y actualizar la capacidad."""
    res_crear = client.post("/capacidades/", json={"nombre": "operario test"})
    cap_id = res_crear.json()["id"]

    payload = {"nombre": "operario test bueno"}
    response = client.put(f"/capacidades/{cap_id}", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == cap_id
    assert data["nombre"] == "operario test bueno"


def test_router_delete_capacidad_exito(client: TestClient):
    """DELETE /capacidades/{id} debe dar 200 OK y eliminar la capacidad."""
    res_crear = client.post("/capacidades/", json={"nombre": "capacidad temporal test"})
    cap_id = res_crear.json()["id"]

    response = client.delete(f"/capacidades/{cap_id}")
    assert response.status_code == 200
    assert response.json()["id"] == cap_id

    # Confirmar que ya no existe (404)
    res_get = client.get(f"/capacidades/{cap_id}")
    assert res_get.status_code == 404

# PRUEBAS NEGATIVAS (CASOS DE FALLA - ROUTER)

def test_router_crear_capacidad_duplicada(client: TestClient):
    """POST /capacidades/ con nombre duplicado debe responder 400 Bad Request."""
    client.post("/capacidades/", json={"nombre": "mantenimiento test"})

    response = client.post("/capacidades/", json={"nombre": "MANTENIMIENTO TEST"})
    assert response.status_code == 400
    assert response.json()["detail"] == "El nombre ya existe"


def test_router_crear_capacidad_payload_invalido(client: TestClient):
    """POST /capacidades/ con payload faltante o inválido debe responder 422 Unprocessable Entity."""
    response = client.post("/capacidades/", json={})
    assert response.status_code == 422


def test_router_read_capacidad_no_encontrada(client: TestClient):
    """GET /capacidades/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.get("/capacidades/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "La capacidad no fue encontrada"


def test_router_update_capacidad_no_encontrada(client: TestClient):
    """PUT /capacidades/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.put("/capacidades/9999", json={"nombre": "nuevo nombre test"})
    assert response.status_code == 404
    assert response.json()["detail"] == "La capacidad no fue encontrada"


def test_router_update_capacidad_nombre_duplicado(client: TestClient):
    """PUT /capacidades/{id} intentando renombrar a un nombre que ya existe debe responder 400 Bad Request."""
    client.post("/capacidades/", json={"nombre": "capacidad a test"})
    res_b = client.post("/capacidades/", json={"nombre": "capacidad b test"})
    cap_b_id = res_b.json()["id"]

    response = client.put(f"/capacidades/{cap_b_id}", json={"nombre": "capacidad a test"})
    assert response.status_code == 400
    assert response.json()["detail"] == "El nombre ya existe"


def test_router_delete_capacidad_no_encontrada(client: TestClient):
    """DELETE /capacidades/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.delete("/capacidades/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "La capacidad no fue encontrada"
