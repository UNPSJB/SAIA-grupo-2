import pytest
from fastapi.testclient import TestClient

# PRUEBAS POSITIVAS (CASOS DE ÉXITO - ROUTER)

def test_router_crear_unidad_medida_exito(client: TestClient):
    """POST /unidades_medida/ debe responder 200 OK y retornar la unidad creada."""
    payload = {"nombre": "unidad router test"}
    response = client.post("/unidades_medida/", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["nombre"] == "unidad router test"


def test_router_listar_unidades_medida(client: TestClient):
    """GET /unidades_medida/ debe responder 200 OK y devolver un arreglo."""
    client.post("/unidades_medida/", json={"nombre": "unidad r1 test"})
    client.post("/unidades_medida/", json={"nombre": "unidad r2 test"})

    response = client.get("/unidades_medida/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_router_read_unidad_medida_exito(client: TestClient):
    """GET /unidades_medida/{id} debe responder 200 OK."""
    res_crear = client.post("/unidades_medida/", json={"nombre": "unidad paquete test"})
    unidad_id = res_crear.json()["id"]

    response = client.get(f"/unidades_medida/{unidad_id}")
    assert response.status_code == 200
    assert response.json()["nombre"] == "unidad paquete test"


def test_router_update_unidad_medida_exito(client: TestClient):
    """PUT /unidades_medida/{id} debe responder 200 OK y actualizar la unidad."""
    res_crear = client.post("/unidades_medida/", json={"nombre": "unidad caja test"})
    unidad_id = res_crear.json()["id"]

    response = client.put(f"/unidades_medida/{unidad_id}", json={"nombre": "unidad cajas modificada test"})
    assert response.status_code == 200
    assert response.json()["nombre"] == "unidad cajas modificada test"


def test_router_delete_unidad_medida_exito(client: TestClient):
    """DELETE /unidades_medida/{id} debe responder 200 OK y eliminar la unidad."""
    res_crear = client.post("/unidades_medida/", json={"nombre": "unidad bidon test"})
    unidad_id = res_crear.json()["id"]

    response = client.delete(f"/unidades_medida/{unidad_id}")
    assert response.status_code == 200

    # Confirmar que ya no existe (404)
    res_get = client.get(f"/unidades_medida/{unidad_id}")
    assert res_get.status_code == 404


# PRUEBAS NEGATIVAS (CASOS DE FALLA - ROUTER)

def test_router_crear_unidad_medida_nombre_vacio(client: TestClient):
    """POST /unidades_medida/ con nombre "" debe responder 400 Bad Request."""
    response = client.post("/unidades_medida/", json={"nombre": ""})
    assert response.status_code == 400
    assert response.json()["detail"] == "la unidad de medida debe tener un nombre."


def test_router_crear_unidad_medida_duplicada(client: TestClient):
    """POST /unidades_medida/ con nombre duplicado debe responder 400 Bad Request."""
    client.post("/unidades_medida/", json={"nombre": "unidad tambores test"})
    response = client.post("/unidades_medida/", json={"nombre": "unidad tambores test"})

    assert response.status_code == 400
    assert response.json()["detail"] == "La unidad de medida ya existe."


def test_router_crear_unidad_medida_payload_invalido(client: TestClient):
    """POST /unidades_medida/ con JSON incompleto debe responder 422 Unprocessable Entity."""
    response = client.post("/unidades_medida/", json={})
    assert response.status_code == 422


def test_router_read_unidad_medida_no_encontrada(client: TestClient):
    """GET /unidades_medida/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.get("/unidades_medida/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "La unidad de medida no fue encontrada."


def test_router_update_unidad_medida_no_encontrada(client: TestClient):
    """PUT /unidades_medida/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.put("/unidades_medida/9999", json={"nombre": "unidad nueva test"})
    assert response.status_code == 404
    assert response.json()["detail"] == "La unidad de medida no fue encontrada."


def test_router_update_unidad_medida_duplicada(client: TestClient):
    """PUT /unidades_medida/{id} con nombre existente debe responder 400 Bad Request."""
    client.post("/unidades_medida/", json={"nombre": "unidad tipo 1 test"})
    res_2 = client.post("/unidades_medida/", json={"nombre": "unidad tipo 2 test"})
    u2_id = res_2.json()["id"]

    response = client.put(f"/unidades_medida/{u2_id}", json={"nombre": "unidad tipo 1 test"})
    assert response.status_code == 400
    assert response.json()["detail"] == "La unidad de medida ya existe."


def test_router_delete_unidad_medida_no_encontrada(client: TestClient):
    """DELETE /unidades_medida/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.delete("/unidades_medida/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "La unidad de medida no fue encontrada."
