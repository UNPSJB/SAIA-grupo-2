from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.empleados.models import Empleado, RolEmpleado
from src.incidentes.constants import ErrorCode

FOTO_VALIDA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="


def _crear_empleado(
    db: Session,
    legajo: str = "EMP-9000",
    dni: str = "40000000",
    nombre: str = "empleado",
    apellido: str = "test",
    rol: RolEmpleado = RolEmpleado.OPERARIO,
) -> Empleado:
    """Crea el empleado que reporta o resuelve, sobre la misma sesion que usa el client."""
    empleado = Empleado(
        legajo=legajo,
        dni=dni,
        nombre=nombre,
        apellido=apellido,
        activo=True,
        rol=rol,
    )
    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


def _registrar_incidente(
    client: TestClient,
    empleado_id: int,
    descripcion: str = "incidente router test",
    tipo: str = "otro",
) -> dict:
    """Registra un incidente por el endpoint y devuelve el cuerpo de la respuesta."""
    respuesta = client.post(
        "/incidentes/",
        json={"descripcion": descripcion, "empleado_id": empleado_id, "tipo": tipo},
    )
    assert respuesta.status_code == 200
    return respuesta.json()


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - ROUTER)

def test_router_crear_incidente_exito(client: TestClient, db_session: Session):
    """POST /incidentes/ debe responder 200 OK y registrar el incidente como abierto."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post(
        "/incidentes/",
        json={
            "descripcion": "se rompio el burlete de la camara 2",
            "empleado_id": empleado.id,
            "tipo": "rotura",
        },
    )
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert "id" in data
    assert data["estado"] == "abierto"
    assert data["tipo"] == "rotura"
    assert data["empleado"]["legajo"] == empleado.legajo
    assert data["fecha_hora_reporte"] is not None


def test_router_crear_incidente_con_foto_opcional(client: TestClient, db_session: Session):
    """POST /incidentes/ debe aceptar la foto opcional al registrar."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post(
        "/incidentes/",
        json={
            "descripcion": "derrame en el sector de envasado",
            "empleado_id": empleado.id,
            "archivo_url": FOTO_VALIDA,
            "archivo_nombre": "derrame.png",
        },
    )
    assert respuesta.status_code == 200
    assert respuesta.json()["archivo_nombre"] == "derrame.png"


def test_router_listar_incidentes(client: TestClient, db_session: Session):
    """GET /incidentes/ debe responder 200 OK y devolver todos los incidentes."""
    empleado = _crear_empleado(db_session)
    _registrar_incidente(client, empleado.id, "incidente 1 test")
    _registrar_incidente(client, empleado.id, "incidente 2 test")

    respuesta = client.get("/incidentes/")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert isinstance(data, list)
    assert len(data) == 2


def test_router_listar_incidentes_filtra_por_estado(client: TestClient, db_session: Session):
    """GET /incidentes/?estado=abierto debe devolver solo los abiertos."""
    empleado = _crear_empleado(db_session)
    _registrar_incidente(client, empleado.id, "sigue abierto test")
    cerrado = _registrar_incidente(client, empleado.id, "ya resuelto test")
    client.put(
        f"/incidentes/{cerrado['id']}/cierre",
        json={"accion_correctiva": "se reemplazo la pieza", "responsable_id": empleado.id},
    )

    respuesta = client.get("/incidentes/?estado=abierto")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == 1
    assert data[0]["descripcion"] == "sigue abierto test"


def test_router_listar_incidentes_filtra_por_tipo(client: TestClient, db_session: Session):
    """GET /incidentes/?tipo=plaga debe devolver solo los de ese tipo."""
    empleado = _crear_empleado(db_session)
    _registrar_incidente(client, empleado.id, "rotura test", tipo="rotura")
    _registrar_incidente(client, empleado.id, "plaga test", tipo="plaga")

    respuesta = client.get("/incidentes/?tipo=plaga")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == 1
    assert data[0]["tipo"] == "plaga"


def test_router_listar_incidentes_abiertos(client: TestClient, db_session: Session):
    """GET /incidentes/abiertos debe devolver solo los que esperan resolucion."""
    empleado = _crear_empleado(db_session)
    _registrar_incidente(client, empleado.id, "pendiente test")
    cerrado = _registrar_incidente(client, empleado.id, "resuelto test")
    client.put(
        f"/incidentes/{cerrado['id']}/cierre",
        json={"accion_correctiva": "se corrigio en el momento", "responsable_id": empleado.id},
    )

    respuesta = client.get("/incidentes/abiertos")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == 1
    assert data[0]["descripcion"] == "pendiente test"


def test_router_abiertos_no_se_confunde_con_el_detalle(client: TestClient):
    """GET /incidentes/abiertos debe resolver como ruta propia y no como /incidentes/{id}."""
    respuesta = client.get("/incidentes/abiertos")
    assert respuesta.status_code == 200
    assert isinstance(respuesta.json(), list)


def test_router_resumen_no_se_confunde_con_el_detalle(client: TestClient):
    """GET /incidentes/resumen debe resolver como ruta propia y no como /incidentes/{id}."""
    respuesta = client.get("/incidentes/resumen")
    assert respuesta.status_code == 200
    assert "abiertos_por_tipo" in respuesta.json()


def test_router_resumen_incidentes(client: TestClient, db_session: Session):
    """GET /incidentes/resumen debe responder 200 OK con los conteos del tablero."""
    empleado = _crear_empleado(db_session)
    _registrar_incidente(client, empleado.id, "abierto 1 test", tipo="rotura")
    _registrar_incidente(client, empleado.id, "abierto 2 test", tipo="rotura")
    cerrado = _registrar_incidente(client, empleado.id, "a cerrar test")
    client.put(
        f"/incidentes/{cerrado['id']}/cierre",
        json={"accion_correctiva": "se normalizo el proceso", "responsable_id": empleado.id},
    )

    respuesta = client.get("/incidentes/resumen")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["abiertos"] == 2
    assert data["cerrados"] == 1
    assert data["total"] == 3

    conteos = {c["tipo"]: c["cantidad"] for c in data["abiertos_por_tipo"]}
    assert conteos["rotura"] == 2


def test_router_leer_incidente_exito(client: TestClient, db_session: Session):
    """GET /incidentes/{id} debe responder 200 OK con el detalle."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id, "incidente a ver test")

    respuesta = client.get(f"/incidentes/{creado['id']}")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["id"] == creado["id"]
    assert data["descripcion"] == "incidente a ver test"
    assert data["movimientos"] == []


def test_router_adjuntar_foto_exito(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/foto debe responder 200 OK y completar la foto faltante."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id)

    respuesta = client.put(
        f"/incidentes/{creado['id']}/foto",
        json={"archivo_url": FOTO_VALIDA, "archivo_nombre": "tardia.png"},
    )
    assert respuesta.status_code == 200
    assert respuesta.json()["archivo_nombre"] == "tardia.png"


def test_router_cerrar_incidente_exito(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/cierre debe responder 200 OK y dejar el incidente cerrado."""
    empleado = _crear_empleado(db_session)
    responsable = _crear_empleado(
        db_session, legajo="EMP-9003", dni="40000003", rol=RolEmpleado.ADMIN
    )
    creado = _registrar_incidente(client, empleado.id)

    respuesta = client.put(
        f"/incidentes/{creado['id']}/cierre",
        json={
            "accion_correctiva": "se cambio el burlete y se sumo al checklist",
            "responsable_id": responsable.id,
        },
    )
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["estado"] == "cerrado"
    assert data["accion_correctiva"] == "se cambio el burlete y se sumo al checklist"
    assert data["fecha_cierre"] is not None
    assert data["responsable_cierre"]["legajo"] == responsable.legajo
    assert data["dias_abierto"] is None
    assert len(data["movimientos"]) == 1
    assert data["movimientos"][0]["tipo"] == "cierre"


def test_router_reabrir_incidente_exito(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/reapertura debe responder 200 OK y volver el incidente a abierto."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id)
    client.put(
        f"/incidentes/{creado['id']}/cierre",
        json={"accion_correctiva": "se creyo resuelto", "responsable_id": empleado.id},
    )

    respuesta = client.put(
        f"/incidentes/{creado['id']}/reapertura",
        json={"motivo": "el problema volvio a aparecer", "responsable_id": empleado.id},
    )
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["estado"] == "abierto"
    assert data["accion_correctiva"] is None
    assert data["fecha_cierre"] is None
    assert data["responsable_cierre"] is None
    assert len(data["movimientos"]) == 2
    assert data["movimientos"][0]["descripcion"] == "se creyo resuelto"
    assert data["movimientos"][1]["tipo"] == "reapertura"


# PRUEBAS NEGATIVAS (CASOS DE FALLA - ROUTER)

def test_router_crear_incidente_empleado_inexistente(client: TestClient):
    """POST /incidentes/ con un empleado inexistente debe responder 404 Not Found."""
    respuesta = client.post(
        "/incidentes/",
        json={"descripcion": "incidente huerfano test", "empleado_id": 9999},
    )
    assert respuesta.status_code == 404


def test_router_crear_incidente_descripcion_corta(client: TestClient, db_session: Session):
    """POST /incidentes/ con una descripcion de menos de 3 caracteres debe responder 422."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post(
        "/incidentes/",
        json={"descripcion": "ab", "empleado_id": empleado.id},
    )
    assert respuesta.status_code == 422


def test_router_crear_incidente_payload_incompleto(client: TestClient):
    """POST /incidentes/ sin empleado_id debe responder 422 Unprocessable Content."""
    respuesta = client.post("/incidentes/", json={"descripcion": "incidente sin autor test"})
    assert respuesta.status_code == 422


def test_router_crear_incidente_tipo_invalido(client: TestClient, db_session: Session):
    """POST /incidentes/ con un tipo fuera del enum debe responder 422."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post(
        "/incidentes/",
        json={
            "descripcion": "incidente con tipo raro test",
            "empleado_id": empleado.id,
            "tipo": "inundacion",
        },
    )
    assert respuesta.status_code == 422


def test_router_crear_incidente_archivo_invalido(client: TestClient, db_session: Session):
    """POST /incidentes/ con un adjunto que no es imagen ni PDF debe responder 400."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post(
        "/incidentes/",
        json={
            "descripcion": "incidente con adjunto raro test",
            "empleado_id": empleado.id,
            "archivo_url": "data:text/plain;base64,aG9sYQ==",
        },
    )
    assert respuesta.status_code == 400


def test_router_leer_incidente_no_encontrado(client: TestClient):
    """GET /incidentes/{id} con ID inexistente debe responder 404 Not Found."""
    respuesta = client.get("/incidentes/9999")
    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == ErrorCode.INCIDENTE_NO_ENCONTRADO


def test_router_adjuntar_foto_no_encontrado(client: TestClient):
    """PUT /incidentes/{id}/foto con ID inexistente debe responder 404 Not Found."""
    respuesta = client.put("/incidentes/9999/foto", json={"archivo_url": FOTO_VALIDA})
    assert respuesta.status_code == 404


def test_router_adjuntar_foto_cuando_ya_tiene_una(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/foto sobre un incidente con foto debe responder 400."""
    empleado = _crear_empleado(db_session)
    respuesta_crear = client.post(
        "/incidentes/",
        json={
            "descripcion": "incidente con foto test",
            "empleado_id": empleado.id,
            "archivo_url": FOTO_VALIDA,
        },
    )
    incidente_id = respuesta_crear.json()["id"]

    respuesta = client.put(f"/incidentes/{incidente_id}/foto", json={"archivo_url": FOTO_VALIDA})
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.FOTO_YA_CARGADA


def test_router_cerrar_incidente_no_encontrado(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/cierre con ID inexistente debe responder 404 Not Found."""
    empleado = _crear_empleado(db_session)

    respuesta = client.put(
        "/incidentes/9999/cierre",
        json={"accion_correctiva": "accion valida test", "responsable_id": empleado.id},
    )
    assert respuesta.status_code == 404


def test_router_cerrar_incidente_ya_cerrado(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/cierre sobre un incidente cerrado debe responder 400."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id)
    cuerpo = {"accion_correctiva": "se resolvio en planta", "responsable_id": empleado.id}
    client.put(f"/incidentes/{creado['id']}/cierre", json=cuerpo)

    respuesta = client.put(f"/incidentes/{creado['id']}/cierre", json=cuerpo)
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.INCIDENTE_YA_CERRADO


def test_router_cerrar_incidente_sin_accion_correctiva(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/cierre con la accion en blanco debe responder 400."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id)

    respuesta = client.put(
        f"/incidentes/{creado['id']}/cierre",
        json={"accion_correctiva": "   ", "responsable_id": empleado.id},
    )
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.ACCION_CORRECTIVA_REQUERIDA


def test_router_cerrar_incidente_responsable_inexistente(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/cierre con un responsable inexistente debe responder 404."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id)

    respuesta = client.put(
        f"/incidentes/{creado['id']}/cierre",
        json={"accion_correctiva": "accion valida test", "responsable_id": 9999},
    )
    assert respuesta.status_code == 404


def test_router_reabrir_incidente_que_sigue_abierto(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/reapertura sobre un incidente abierto debe responder 400."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id)

    respuesta = client.put(
        f"/incidentes/{creado['id']}/reapertura",
        json={"motivo": "quiero reabrirlo igual", "responsable_id": empleado.id},
    )
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.INCIDENTE_NO_CERRADO


def test_router_reabrir_incidente_sin_motivo(client: TestClient, db_session: Session):
    """PUT /incidentes/{id}/reapertura con el motivo en blanco debe responder 400."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id)
    client.put(
        f"/incidentes/{creado['id']}/cierre",
        json={"accion_correctiva": "se dio por resuelto", "responsable_id": empleado.id},
    )

    respuesta = client.put(
        f"/incidentes/{creado['id']}/reapertura",
        json={"motivo": "   ", "responsable_id": empleado.id},
    )
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.MOTIVO_REAPERTURA_REQUERIDO


def test_router_no_permite_editar_el_incidente(client: TestClient, db_session: Session):
    """PUT /incidentes/{id} no existe por diseno: el incidente no se edita."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id)

    respuesta = client.put(
        f"/incidentes/{creado['id']}",
        json={"descripcion": "descripcion cambiada test", "empleado_id": empleado.id},
    )
    assert respuesta.status_code == 405


def test_router_no_permite_eliminar_el_incidente(client: TestClient, db_session: Session):
    """DELETE /incidentes/{id} no existe por diseno: el incidente no se borra."""
    empleado = _crear_empleado(db_session)
    creado = _registrar_incidente(client, empleado.id)

    respuesta = client.delete(f"/incidentes/{creado['id']}")
    assert respuesta.status_code == 405
