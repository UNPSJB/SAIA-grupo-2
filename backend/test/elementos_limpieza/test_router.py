from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient

# PRUEBAS POSITIVAS (CASOS DE ÉXITO - ROUTER)

def test_router_crear_elemento_exito(client: TestClient):
    """POST /elementos_limpieza/ debe responder 200 OK y crear el elemento."""
    payload = {
        "nombre": "elemento cepillo test",
        "frecuencia_recambio_dias": 20,
        "activo": True
    }
    response = client.post("/elementos_limpieza/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["nombre"] == "elemento cepillo test"
    assert data["frecuencia_recambio_dias"] == 20


def test_router_listar_elementos_y_alertas(client: TestClient):
    """GET /elementos_limpieza/ y GET /elementos_limpieza/alertas deben responder 200 OK."""
    client.post("/elementos_limpieza/", json={"nombre": "elemento r1 test", "frecuencia_recambio_dias": 30})

    # Elemento vencido
    fecha_vieja = (date.today() - timedelta(days=40)).isoformat()
    client.post("/elementos_limpieza/", json={
        "nombre": "elemento vencido test",
        "frecuencia_recambio_dias": 15,
        "fecha_ultimo_recambio": fecha_vieja
    })

    res_list = client.get("/elementos_limpieza/")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 2

    res_alertas = client.get("/elementos_limpieza/alertas")
    assert res_alertas.status_code == 200
    alertas = res_alertas.json()
    assert any(a["nombre"] == "elemento vencido test" for a in alertas)


def test_router_read_elemento_exito(client: TestClient):
    """GET /elementos_limpieza/{id} debe responder 200 OK."""
    res_crear = client.post("/elementos_limpieza/", json={"nombre": "elemento ropa test"})
    elem_id = res_crear.json()["id"]

    response = client.get(f"/elementos_limpieza/{elem_id}")
    assert response.status_code == 200
    assert response.json()["id"] == elem_id


def test_router_update_elemento_exito(client: TestClient):
    """PUT /elementos_limpieza/{id} debe responder 200 OK."""
    res_crear = client.post("/elementos_limpieza/", json={"nombre": "elemento franela viejo test"})
    elem_id = res_crear.json()["id"]

    payload = {"nombre": "elemento franela nuevo test", "frecuencia_recambio_dias": 10, "activo": True}
    response = client.put(f"/elementos_limpieza/{elem_id}", json=payload)
    assert response.status_code == 200
    assert response.json()["nombre"] == "elemento franela nuevo test"


def test_router_create_recambio_exito(client: TestClient):
    """POST /elementos_limpieza/{id}/recambio debe responder 200 OK y actualizar la fecha."""
    res_crear = client.post("/elementos_limpieza/", json={
        "nombre": "elemento guantes test",
        "frecuencia_recambio_dias": 15
    })
    elem_id = res_crear.json()["id"]

    payload = {"fecha_recambio": date.today().isoformat()}
    response = client.post(f"/elementos_limpieza/{elem_id}/recambio", json=payload)
    assert response.status_code == 200
    assert response.json()["fecha_ultimo_recambio"] == date.today().isoformat()


def test_router_delete_elemento_inactivo_exito(client: TestClient):
    """DELETE /elementos_limpieza/{id} sobre elemento inactivo debe responder 200 OK."""
    res_crear = client.post("/elementos_limpieza/", json={"nombre": "elemento para borrar test"})
    elem_id = res_crear.json()["id"]

    # Dar de baja lógica
    client.put(f"/elementos_limpieza/{elem_id}", json={"nombre": "elemento para borrar test", "activo": False})

    # Eliminar físicamente
    res_delete = client.delete(f"/elementos_limpieza/{elem_id}")
    assert res_delete.status_code == 200
    assert res_delete.json()["id"] == elem_id


# PRUEBAS NEGATIVAS (CASOS DE FALLA - ROUTER)

def test_router_crear_elemento_fecha_futura(client: TestClient):
    """POST /elementos_limpieza/ con fecha futura debe responder 400 Bad Request."""
    fecha_futura = (date.today() + timedelta(days=5)).isoformat()
    payload = {
        "nombre": "elemento futuro test",
        "fecha_ultimo_recambio": fecha_futura
    }
    response = client.post("/elementos_limpieza/", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "La fecha de recambio no puede ser posterior a hoy."


def test_router_crear_elemento_frecuencia_invalida(client: TestClient):
    """POST /elementos_limpieza/ con frecuencia <= 0 debe responder 422 Unprocessable Entity."""
    payload = {"nombre": "elemento frecuencia invalida test", "frecuencia_recambio_dias": 0}
    response = client.post("/elementos_limpieza/", json=payload)
    assert response.status_code == 422


def test_router_read_elemento_no_encontrado(client: TestClient):
    """GET /elementos_limpieza/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.get("/elementos_limpieza/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "El elemento de limpieza no fue encontrado."


def test_router_update_elemento_no_encontrado(client: TestClient):
    """PUT /elementos_limpieza/{id} con ID inexistente debe responder 404 Not Found."""
    payload = {"nombre": "elemento inexistente test", "activo": True}
    response = client.put("/elementos_limpieza/9999", json=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "El elemento de limpieza no fue encontrado."


def test_router_recambio_sin_frecuencia(client: TestClient):
    """POST /elementos_limpieza/{id}/recambio en elemento sin frecuencia debe responder 400 Bad Request."""
    res_crear = client.post("/elementos_limpieza/", json={"nombre": "elemento sin frecuencia test"})
    elem_id = res_crear.json()["id"]

    response = client.post(f"/elementos_limpieza/{elem_id}/recambio", json={})
    assert response.status_code == 400
    assert response.json()["detail"] == "El elemento no tiene una frecuencia de recambio configurada."


def test_router_delete_elemento_activo_falla(client: TestClient):
    """DELETE /elementos_limpieza/{id} en elemento activo debe responder 400 Bad Request."""
    res_crear = client.post("/elementos_limpieza/", json={"nombre": "elemento activo test", "activo": True})
    elem_id = res_crear.json()["id"]

    response = client.delete(f"/elementos_limpieza/{elem_id}")
    assert response.status_code == 400
    assert "activos no se pueden eliminar físicamente" in response.json()["detail"]


def test_router_delete_elemento_no_encontrado(client: TestClient):
    """DELETE /elementos_limpieza/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.delete("/elementos_limpieza/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "El elemento de limpieza no fue encontrado."
