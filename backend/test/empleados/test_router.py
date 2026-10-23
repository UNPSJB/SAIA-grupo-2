import pytest
from fastapi.testclient import TestClient


# Helper para crear sector base
def _crear_sector_api(client: TestClient, nombre: str = "Sector API") -> int:
    res = client.post("/sectores/", json={"nombre": nombre})
    if res.status_code == 200:
        return res.json()["id"]
    return 1


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - ROUTER)

def test_router_crear_y_login_empleado_exito(client: TestClient):
    """POST /empleados/ debe responder 200 OK y POST /empleados/login autenticar a Román Riquelme."""
    sector_id = _crear_sector_api(client, "Sector Envasado Principal")

    payload = {
        "dni": "40111222",
        "nombre": "Román",
        "apellido": "Riquelme",
        "activo": True,
        "listaSectores": [sector_id]
    }

    res_crear = client.post("/empleados/", json=payload)
    assert res_crear.status_code == 200
    emp_data = res_crear.json()
    assert emp_data["dni"] == "40111222"
    assert emp_data["nombre"] == "Román"
    assert emp_data["apellido"] == "Riquelme"
    assert "legajo" in emp_data

    # Login
    login_payload = {
        "legajo": emp_data["legajo"],
        "dni": "40111222"
    }
    res_login = client.post("/empleados/login", json=login_payload)
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert login_data["mensaje"] == "Autenticación exitosa"
    assert login_data["empleado"]["id"] == emp_data["id"]


def test_router_listar_y_leer_empleados(client: TestClient):
    """GET /empleados/ y GET /empleados/{id} deben responder 200 OK para Leandro Paredes."""
    sector_id = _crear_sector_api(client, "Sector Despacho y Logistica")

    payload = {
        "dni": "50111222",
        "nombre": "Leandro",
        "apellido": "Paredes",
        "listaSectores": [sector_id]
    }
    res_crear = client.post("/empleados/", json=payload)
    emp_id = res_crear.json()["id"]

    # Listar
    res_list = client.get("/empleados/")
    assert res_list.status_code == 200
    assert isinstance(res_list.json(), list)

    # Leer por ID
    res_read = client.get(f"/empleados/{emp_id}")
    assert res_read.status_code == 200
    assert res_read.json()["id"] == emp_id
    assert res_read.json()["nombre"] == "Leandro"


def test_router_update_empleado_exito(client: TestClient):
    """PUT /empleados/{id} debe responder 200 OK y actualizar los datos de Nicolás Otamendi."""
    sector_id = _crear_sector_api(client, "Sector Mantenimiento Mecanico")

    payload = {
        "dni": "60111222",
        "nombre": "Nicolás",
        "apellido": "Otamendi",
        "listaSectores": [sector_id]
    }
    res_crear = client.post("/empleados/", json=payload)
    emp_id = res_crear.json()["id"]

    update_payload = {
        "dni": "60111222",
        "nombre": "Nicolás Hernán",
        "apellido": "Otamendi",
        "activo": True,
        "listaSectores": [sector_id]
    }
    res_update = client.put(f"/empleados/{emp_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["nombre"] == "Nicolás Hernán"


def test_router_delete_empleado_inactivo_exito(client: TestClient):
    """DELETE /empleados/{id} en empleado inactivo (Nahuel Molina) debe responder 200 OK."""
    sector_id = _crear_sector_api(client, "Sector Control Quimico")

    payload = {
        "dni": "70111222",
        "nombre": "Nahuel",
        "apellido": "Molina",
        "listaSectores": [sector_id]
    }
    res_crear = client.post("/empleados/", json=payload)
    emp_id = res_crear.json()["id"]

    # Dar de baja lógica primero
    update_payload = {
        "dni": "70111222",
        "nombre": "Nahuel",
        "apellido": "Molina",
        "activo": False,
        "listaSectores": [sector_id]
    }
    client.put(f"/empleados/{emp_id}", json=update_payload)

    # Eliminar físicamente
    res_delete = client.delete(f"/empleados/{emp_id}")
    assert res_delete.status_code == 200
    assert res_delete.json()["id"] == emp_id


# PRUEBAS NEGATIVAS (CASOS DE FALLA - ROUTER)

def test_router_login_credenciales_invalidas(client: TestClient):
    """POST /empleados/login con datos incorrectos debe responder 401 Unauthorized."""
    response = client.post("/empleados/login", json={"legajo": "EMP-9999", "dni": "00000000"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Legajo o DNI incorrectos, o el empleado no esta activo"


def test_router_crear_empleado_dni_duplicado(client: TestClient):
    """POST /empleados/ con DNI repetido debe responder 400 Bad Request."""
    sector_id = _crear_sector_api(client, "Sector Deposito Central")

    payload = {"dni": "88888888", "nombre": "Gonzalo", "apellido": "Montiel", "listaSectores": [sector_id]}
    client.post("/empleados/", json=payload)

    payload_dup = {"dni": "88888888", "nombre": "Marcos", "apellido": "Acuña", "listaSectores": [sector_id]}
    response = client.post("/empleados/", json=payload_dup)

    assert response.status_code == 400
    assert response.json()["detail"] == "El DNI ya se encuentra registrado"


def test_router_crear_empleado_sin_sector(client: TestClient):
    """POST /empleados/ sin listaSectores o vacía debe responder 400 Bad Request."""
    payload = {"dni": "99999999", "nombre": "Germán", "apellido": "Pezzella", "listaSectores": []}
    response = client.post("/empleados/", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "El empleado debe tener al menos un sector asignado"


def test_router_crear_empleado_payload_invalido(client: TestClient):
    """POST /empleados/ con campos requeridos faltantes debe responder 422 Unprocessable Entity."""
    response = client.post("/empleados/", json={"nombre": "Incompleto"})
    assert response.status_code == 422


def test_router_read_empleado_no_encontrado(client: TestClient):
    """GET /empleados/{id} con ID inexistente debe responder 404 Not Found."""
    response = client.get("/empleados/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "El empleado no fue encontrado"


def test_router_update_empleado_no_encontrado(client: TestClient):
    """PUT /empleados/{id} con ID inexistente debe responder 404 Not Found."""
    payload = {"dni": "12312312", "nombre": "Cristian", "apellido": "Romero", "listaSectores": [1]}
    response = client.put("/empleados/9999", json=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "El empleado no fue encontrado"


def test_router_delete_empleado_activo(client: TestClient):
    """DELETE /empleados/{id} en empleado activo debe responder 400 Bad Request."""
    sector_id = _crear_sector_api(client, "Sector Calidad Activa")

    payload = {"dni": "11221122", "nombre": "Gerónimo", "apellido": "Rulli", "listaSectores": [sector_id]}
    res_crear = client.post("/empleados/", json=payload)
    emp_id = res_crear.json()["id"]

    response = client.delete(f"/empleados/{emp_id}")
    assert response.status_code == 400
    assert "activos no se pueden eliminar físicamente" in response.json()["detail"]
