import pytest
from fastapi.testclient import TestClient


# Helper para crear unidad de medida 
def _crear_unidad_api(client: TestClient, nombre: str = "unidad test") -> int:
    res = client.post("/unidades_medida/", json={"nombre": nombre})
    if res.status_code == 200:
        return res.json()["id"]
    return 1

# PRUEBAS POSITIVAS (CASOS DE ÉXITO - ROUTER)

def test_router_crear_insumo_exito(client: TestClient):
    """POST /insumos/ debe responder 200 OK y crear el insumo."""
    unidad_id = _crear_unidad_api(client, "unidad insumo test 1")

    payload = {
        "nombre": "insumo router test",
        "unidad_medida_id": unidad_id,
        "activo": True
    }
    response = client.post("/insumos/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["nombre"] == "insumo router test"


def test_router_listar_insumos(client: TestClient):
    """GET /insumos/ debe responder 200 OK y devolver una lista."""
    unidad_id = _crear_unidad_api(client, "unidad insumo test 2")

    client.post("/insumos/", json={"nombre": "insumo 1 test", "unidad_medida_id": unidad_id})
    client.post("/insumos/", json={"nombre": "insumo 2 test", "unidad_medida_id": unidad_id})

    response = client.get("/insumos/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_router_read_insumo_exito(client: TestClient):
    """GET /insumos/{id} debe responder 200 OK."""
    unidad_id = _crear_unidad_api(client, "unidad insumo test 3")
    res_crear = client.post(
        "/insumos/",
        json={"nombre": "insumo read test", "unidad_medida_id": unidad_id}
    )
    insumo_id = res_crear.json()["id"]

    response = client.get(f"/insumos/{insumo_id}")
    assert response.status_code == 200
    assert response.json()["id"] == insumo_id


def test_router_update_insumo_exito(client: TestClient):
    """PUT /insumos/{id} debe responder 200 OK."""
    unidad_id = _crear_unidad_api(client, "unidad insumo test 4")
    res_crear = client.post(
        "/insumos/",
        json={"nombre": "insumo update viejo test", "unidad_medida_id": unidad_id}
    )
    insumo_id = res_crear.json()["id"]

    payload = {
        "nombre": "insumo update nuevo test",
        "unidad_medida_id": unidad_id,
        "activo": True
    }
    response = client.put(f"/insumos/{insumo_id}", json=payload)
    assert response.status_code == 200
    assert response.json()["nombre"] == "insumo update nuevo test"


def test_router_delete_insumo_inactivo_exito(client: TestClient):
    """DELETE /insumos/{id} sobre un insumo inactivo (activo=False) debe responder 200 OK."""
    unidad_id = _crear_unidad_api(client, "unidad insumo test 5")
    res_crear = client.post(
        "/insumos/",
        json={"nombre": "insumo borrable test", "unidad_medida_id": unidad_id}
    )
    insumo_id = res_crear.json()["id"]

    # Dar de baja lógica
    update_payload = {
        "nombre": "insumo borrable test",
        "unidad_medida_id": unidad_id,
        "activo": False
    }
    client.put(f"/insumos/{insumo_id}", json=update_payload)

    # Eliminar físicamente
    res_delete = client.delete(f"/insumos/{insumo_id}")
    assert res_delete.status_code == 200
    assert res_delete.json()["id"] == insumo_id


# PRUEBAS NEGATIVAS (CASOS DE FALLA - ROUTER)

def test_router_crear_insumo_nombre_vacio(client: TestClient):
    """POST /insumos/ con nombre "" debe responder 400 Bad Request."""
    unidad_id = _crear_unidad_api(client, "unidad vacia test")
    payload = {"nombre": "", "unidad_medida_id": unidad_id}

    response = client.post("/insumos/", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "El insumo debe tener un nombre."


def test_router_crear_insumo_nombre_duplicado(client: TestClient):
    """POST /insumos/ con nombre duplicado debe responder 400 Bad Request."""
    unidad_id = _crear_unidad_api(client, "unidad duplicada test")
    payload = {"nombre": "insumo unico test", "unidad_medida_id": unidad_id}
    client.post("/insumos/", json=payload)

    response = client.post("/insumos/", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "El nombre del insumo ya existe."


def test_router_crear_insumo_payload_invalido(client: TestClient):
    """POST /insumos/ con payload faltante debe responder 422 Unprocessable Entity."""
    response = client.post("/insumos/", json={"nombre": "Incompleto"})
    assert response.status_code == 422


def test_router_read_insumo_no_encontrado(client: TestClient):
    """GET /insumos/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.get("/insumos/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "El insumo no fue encontrado."


def test_router_update_insumo_no_encontrado(client: TestClient):
    """PUT /insumos/{id} con ID inexistente debe responder 404 Not Found."""
    payload = {"nombre": "insumo inexistente test", "unidad_medida_id": 1, "activo": True}
    response = client.put("/insumos/9999", json=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "El insumo no fue encontrado."


def test_router_delete_insumo_activo_falla(client: TestClient):
    """DELETE /insumos/{id} sobre un insumo activo debe responder 400 Bad Request."""
    unidad_id = _crear_unidad_api(client, "unidad activo test")
    res_crear = client.post(
        "/insumos/",
        json={"nombre": "insumo activo router test", "unidad_medida_id": unidad_id, "activo": True}
    )
    insumo_id = res_crear.json()["id"]

    response = client.delete(f"/insumos/{insumo_id}")
    assert response.status_code == 400
    assert "activos no se pueden eliminar físicamente" in response.json()["detail"]


def test_router_delete_insumo_no_encontrado(client: TestClient):
    """DELETE /insumos/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.delete("/insumos/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "El insumo no fue encontrado."
