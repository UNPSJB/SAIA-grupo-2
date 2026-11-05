
from fastapi.testclient import TestClient


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - ROUTER)

def test_router_crear_sector_exito(client: TestClient):
    """POST /sectores/ debe responder 200 y devolver el sector creado."""
    payload = {"nombre": "Cocina router test"}

    response = client.post("/sectores/", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["nombre"] == "Cocina router test"
    assert data["activo"] is True


def test_router_listar_sectores(client: TestClient):
    """GET /sectores/ debe devolver una lista de sectores."""
    client.post("/sectores/", json={"nombre": "Cocina listado test"})
    client.post("/sectores/", json={"nombre": "Depósito listado test"})

    response = client.get("/sectores/")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2


def test_router_leer_sector_exito(client: TestClient):
    """GET /sectores/{id} debe devolver el sector solicitado."""
    creado = client.post(
        "/sectores/",
        json={"nombre": "Cocina lectura router test"},
    )
    sector_id = creado.json()["id"]

    response = client.get(f"/sectores/{sector_id}")

    assert response.status_code == 200
    assert response.json()["id"] == sector_id
    assert response.json()["nombre"] == "Cocina lectura router test"


def test_router_modificar_sector_exito(client: TestClient):
    """PUT /sectores/{id} debe actualizar los datos del sector."""
    creado = client.post(
        "/sectores/",
        json={"nombre": "Cocina original router test"},
    )
    sector_id = creado.json()["id"]

    payload = {
        "nombre": "Cocina modificada router test",
        "responsable_id": None,
        "activo": True,
    }
    response = client.put(f"/sectores/{sector_id}", json=payload)

    assert response.status_code == 200
    assert response.json()["id"] == sector_id
    assert response.json()["nombre"] == "Cocina modificada router test"


def test_router_eliminar_sector_inactivo_exito(client: TestClient):
    """DELETE /sectores/{id} debe permitir eliminar un sector inactivo y vacío."""
    creado = client.post(
        "/sectores/",
        json={"nombre": "Sector eliminable router test"},
    )
    sector_id = creado.json()["id"]

    baja = client.put(
        f"/sectores/{sector_id}",
        json={
            "nombre": "Sector eliminable router test",
            "responsable_id": None,
            "activo": False,
        },
    )
    assert baja.status_code == 200

    response = client.delete(f"/sectores/{sector_id}")

    assert response.status_code == 200
    assert response.json()["id"] == sector_id

    consulta = client.get(f"/sectores/{sector_id}")
    assert consulta.status_code == 404


# PRUEBAS NEGATIVAS (CASOS DE FALLA - ROUTER)

def test_router_crear_sector_nombre_duplicado(client: TestClient):
    """POST /sectores/ con un nombre duplicado debe responder 400."""
    client.post("/sectores/", json={"nombre": "Cocina duplicada router test"})

    response = client.post(
        "/sectores/",
        json={"nombre": "COCINA DUPLICADA ROUTER TEST"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Ya existe un sector registrado con ese nombre"
    )


def test_router_crear_sector_nombre_vacio(client: TestClient):
    """POST /sectores/ con nombre vacío debe rechazar la solicitud."""
    response = client.post("/sectores/", json={"nombre": ""})

    # Pydantic valida el nombre y FastAPI devuelve 422.
    assert response.status_code == 422


def test_router_leer_sector_inexistente(client: TestClient):
    """GET /sectores/{id} con ID inexistente debe responder 404."""
    response = client.get("/sectores/9999")

    assert response.status_code == 404
    assert response.json()["detail"] == "El sector no fue encontrado"


def test_router_modificar_sector_inexistente(client: TestClient):
    """PUT /sectores/{id} con ID inexistente debe responder 404."""
    response = client.put(
        "/sectores/9999",
        json={
            "nombre": "Sector inexistente router test",
            "responsable_id": None,
            "activo": True,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "El sector no fue encontrado"


def test_router_eliminar_sector_activo_falla(client: TestClient):
    """DELETE /sectores/{id} no debe eliminar físicamente un sector activo."""
    creado = client.post(
        "/sectores/",
        json={"nombre": "Sector activo router test"},
    )
    sector_id = creado.json()["id"]

    response = client.delete(f"/sectores/{sector_id}")

    assert response.status_code == 400
    assert "activos no se pueden eliminar físicamente" in (
        response.json()["detail"]
    )


def test_router_eliminar_sector_inexistente(client: TestClient):
    """DELETE /sectores/{id} con ID inexistente debe responder 404."""
    response = client.delete("/sectores/9999")

    assert response.status_code == 404
    assert response.json()["detail"] == "El sector no fue encontrado"
