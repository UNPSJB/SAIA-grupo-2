from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.documentacion.constants import DIAS_AVISO_POR_DEFECTO, ErrorCode, TipoDocumentacion
from src.empleados.models import Empleado, RolEmpleado

ARCHIVO_VALIDO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
HOY = date.today()


def _crear_empleado(
    db: Session,
    legajo: str = "EMP-9000",
    dni: str = "40000000",
    nombre: str = "empleado",
    apellido: str = "test",
    activo: bool = True,
) -> Empleado:
    """Crea el empleado sobre la misma sesion que usa el client."""
    empleado = Empleado(
        legajo=legajo,
        dni=dni,
        nombre=nombre,
        apellido=apellido,
        activo=activo,
        rol=RolEmpleado.OPERARIO,
    )
    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


def _fecha(dias: int) -> str:
    """Devuelve la fecha de vencimiento en el formato que viaja por JSON."""
    return (HOY + timedelta(days=dias)).isoformat()


def _payload_libreta(
    empleado_id: int,
    dias: int = 200,
    numero_carnet: str = "LS-1000",
    autoridad_emisora: str = "Municipio de Trelew",
) -> dict:
    """Arma el cuerpo de alta de una libreta sanitaria."""
    return {
        "tipo": TipoDocumentacion.LIBRETA_SANITARIA.value,
        "empleado_id": empleado_id,
        "fecha_vencimiento": _fecha(dias),
        "numero_carnet": numero_carnet,
        "autoridad_emisora": autoridad_emisora,
    }


def _payload_capacitacion(empleado_id: int, dias: int = 200, titulo: str = "BPM test") -> dict:
    """Arma el cuerpo de alta de una capacitacion."""
    return {
        "tipo": TipoDocumentacion.CAPACITACION.value,
        "empleado_id": empleado_id,
        "fecha_vencimiento": _fecha(dias),
        "titulo": titulo,
    }


def _payload_certificado(empleado_id: int, dias: int = 200) -> dict:
    """Arma el cuerpo de alta de un certificado de aptitud fisica."""
    return {
        "tipo": TipoDocumentacion.CERTIFICADO_APTITUD_FISICA.value,
        "empleado_id": empleado_id,
        "fecha_vencimiento": _fecha(dias),
        "nombre_medico": "Gomez",
        "matricula": "MP-1234",
    }


def _crear(client: TestClient, payload: dict) -> dict:
    """Carga un documento por el endpoint y devuelve el cuerpo de la respuesta."""
    respuesta = client.post("/documentacion/", json=payload)
    assert respuesta.status_code == 200
    return respuesta.json()


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - ROUTER)

def test_router_crear_libreta_sanitaria_exito(client: TestClient, db_session: Session):
    """POST /documentacion/ debe responder 200 OK y cargar la libreta sanitaria."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post("/documentacion/", json=_payload_libreta(empleado.id))
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert "id" in data
    assert data["tipo"] == "libreta_sanitaria"
    assert data["numero_carnet"] == "LS-1000"
    assert data["empleado"]["legajo"] == empleado.legajo
    assert data["estado"] == "vigente"


def test_router_crear_capacitacion_exito(client: TestClient, db_session: Session):
    """POST /documentacion/ debe aceptar una capacitacion con sus campos propios."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post("/documentacion/", json=_payload_capacitacion(empleado.id))
    assert respuesta.status_code == 200
    assert respuesta.json()["titulo"] == "BPM test"


def test_router_crear_certificado_exito(client: TestClient, db_session: Session):
    """POST /documentacion/ debe aceptar un certificado de aptitud fisica."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post("/documentacion/", json=_payload_certificado(empleado.id))
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["nombre_medico"] == "Gomez"
    assert data["matricula"] == "MP-1234"


def test_router_crear_documentacion_con_archivo(client: TestClient, db_session: Session):
    """POST /documentacion/ debe guardar el archivo escaneado del documento."""
    empleado = _crear_empleado(db_session)
    payload = _payload_libreta(empleado.id)
    payload["archivo_url"] = ARCHIVO_VALIDO
    payload["archivo_nombre"] = "libreta.png"

    respuesta = client.post("/documentacion/", json=payload)
    assert respuesta.status_code == 200
    assert respuesta.json()["archivo_nombre"] == "libreta.png"


def test_router_listar_documentacion(client: TestClient, db_session: Session):
    """GET /documentacion/ debe responder 200 OK y devolver una lista."""
    empleado = _crear_empleado(db_session)
    _crear(client, _payload_libreta(empleado.id))
    _crear(client, _payload_capacitacion(empleado.id))

    respuesta = client.get("/documentacion/")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert isinstance(data, list)
    assert len(data) == 2


def test_router_listar_documentacion_filtra_por_empleado(client: TestClient, db_session: Session):
    """GET /documentacion/?empleado_id= debe devolver solo los documentos de esa persona."""
    uno = _crear_empleado(db_session, legajo="EMP-9001", dni="40000001")
    otro = _crear_empleado(db_session, legajo="EMP-9002", dni="40000002")
    _crear(client, _payload_libreta(uno.id, numero_carnet="LS-A"))
    _crear(client, _payload_libreta(otro.id, numero_carnet="LS-B"))

    respuesta = client.get(f"/documentacion/?empleado_id={uno.id}")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == 1
    assert data[0]["numero_carnet"] == "LS-A"


def test_router_listar_documentacion_filtra_por_tipo(client: TestClient, db_session: Session):
    """GET /documentacion/?tipo= debe devolver solo ese tipo de documento."""
    empleado = _crear_empleado(db_session)
    _crear(client, _payload_libreta(empleado.id))
    _crear(client, _payload_capacitacion(empleado.id))

    respuesta = client.get("/documentacion/?tipo=capacitacion")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == 1
    assert data[0]["tipo"] == "capacitacion"


def test_router_leer_documentacion_exito(client: TestClient, db_session: Session):
    """GET /documentacion/{id} debe responder 200 OK con el detalle."""
    empleado = _crear_empleado(db_session)
    creado = _crear(client, _payload_libreta(empleado.id))

    respuesta = client.get(f"/documentacion/{creado['id']}")
    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == creado["id"]


def test_router_update_documentacion_exito(client: TestClient, db_session: Session):
    """PUT /documentacion/{id} debe responder 200 OK y renovar el documento."""
    empleado = _crear_empleado(db_session)
    creado = _crear(client, _payload_libreta(empleado.id, dias=10))

    respuesta = client.put(
        f"/documentacion/{creado['id']}",
        json={"fecha_vencimiento": _fecha(400), "numero_carnet": "LS-2000"},
    )
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["fecha_vencimiento"] == _fecha(400)
    assert data["numero_carnet"] == "LS-2000"


def test_router_delete_documentacion_exito(client: TestClient, db_session: Session):
    """DELETE /documentacion/{id} debe responder 200 OK."""
    empleado = _crear_empleado(db_session)
    creado = _crear(client, _payload_libreta(empleado.id))

    respuesta = client.delete(f"/documentacion/{creado['id']}")
    assert respuesta.status_code == 200
    assert respuesta.json()["msg"] == "borrado"
    assert client.get(f"/documentacion/{creado['id']}").status_code == 404


def test_router_alertas_ordena_vencidos_primero(client: TestClient, db_session: Session):
    """GET /documentacion/alertas debe priorizar los documentos vencidos."""
    empleado = _crear_empleado(db_session)
    _crear(client, _payload_libreta(empleado.id, dias=300))
    _crear(client, _payload_capacitacion(empleado.id, dias=5))
    _crear(client, _payload_certificado(empleado.id, dias=-20))

    respuesta = client.get("/documentacion/alertas")
    assert respuesta.status_code == 200
    assert [a["estado"] for a in respuesta.json()] == ["vencido", "proximo", "vigente"]


def test_router_alertas_filtra_por_tipo(client: TestClient, db_session: Session):
    """GET /documentacion/alertas?tipo= debe acotar las alertas a ese tipo."""
    empleado = _crear_empleado(db_session)
    _crear(client, _payload_libreta(empleado.id))
    _crear(client, _payload_capacitacion(empleado.id))

    respuesta = client.get("/documentacion/alertas?tipo=capacitacion")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == 1
    assert data[0]["tipo"] == "capacitacion"


def test_router_alertas_filtra_por_rango_de_fechas(client: TestClient, db_session: Session):
    """GET /documentacion/alertas con desde y hasta debe acotar por fecha de vencimiento."""
    empleado = _crear_empleado(db_session)
    _crear(client, _payload_capacitacion(empleado.id, dias=5))
    _crear(client, _payload_certificado(empleado.id, dias=50))
    _crear(client, _payload_libreta(empleado.id, dias=300))

    respuesta = client.get(
        f"/documentacion/alertas?fecha_desde={_fecha(10)}&fecha_hasta={_fecha(100)}"
    )
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == 1
    assert data[0]["tipo"] == "certificado_aptitud_fisica"


def test_router_alertas_no_se_confunde_con_el_detalle(client: TestClient):
    """GET /documentacion/alertas debe resolver como ruta propia y no como /{documentacion_id}."""
    respuesta = client.get("/documentacion/alertas")
    assert respuesta.status_code == 200
    assert isinstance(respuesta.json(), list)


def test_router_requisitos_no_se_confunde_con_el_detalle(client: TestClient):
    """GET /documentacion/requisitos debe resolver como ruta propia y no como /{documentacion_id}."""
    respuesta = client.get("/documentacion/requisitos")
    assert respuesta.status_code == 200
    assert isinstance(respuesta.json(), list)


def test_router_cumplimiento_no_se_confunde_con_el_detalle(client: TestClient):
    """GET /documentacion/cumplimiento debe resolver como ruta propia y no como /{documentacion_id}."""
    respuesta = client.get("/documentacion/cumplimiento")
    assert respuesta.status_code == 200
    assert isinstance(respuesta.json(), list)


def test_router_listar_requisitos_crea_los_que_faltan(client: TestClient):
    """GET /documentacion/requisitos debe devolver un requisito por cada tipo."""
    respuesta = client.get("/documentacion/requisitos")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == len(TipoDocumentacion)
    for requisito in data:
        assert requisito["obligatorio"] is False
        assert requisito["dias_aviso_previo"] == DIAS_AVISO_POR_DEFECTO[requisito["tipo"]]


def test_router_update_requisito_exito(client: TestClient):
    """PUT /documentacion/requisitos/{tipo} debe marcar el tipo como obligatorio."""
    respuesta = client.put(
        "/documentacion/requisitos/libreta_sanitaria",
        json={"obligatorio": True, "dias_aviso_previo": 90},
    )
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["obligatorio"] is True
    assert data["dias_aviso_previo"] == 90


def test_router_cumplimiento_de_un_empleado(client: TestClient, db_session: Session):
    """GET /documentacion/cumplimiento/{id} debe informar faltantes y vencidos."""
    empleado = _crear_empleado(db_session)
    client.put(
        "/documentacion/requisitos/libreta_sanitaria", json={"obligatorio": True}
    )

    respuesta = client.get(f"/documentacion/cumplimiento/{empleado.id}")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["completo"] is False
    assert data["faltantes"] == ["libreta_sanitaria"]


def test_router_cumplimiento_solo_incompletos(client: TestClient, db_session: Session):
    """GET /documentacion/cumplimiento?solo_incompletos=true debe filtrar al personal en regla."""
    en_regla = _crear_empleado(db_session, legajo="EMP-9001", dni="40000001")
    sin_libreta = _crear_empleado(db_session, legajo="EMP-9002", dni="40000002")
    client.put("/documentacion/requisitos/libreta_sanitaria", json={"obligatorio": True})
    _crear(client, _payload_libreta(en_regla.id, dias=300))

    respuesta = client.get("/documentacion/cumplimiento?solo_incompletos=true")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == 1
    assert data[0]["empleado"]["id"] == sin_libreta.id


# PRUEBAS NEGATIVAS (CASOS DE FALLA - ROUTER)

def test_router_crear_documentacion_empleado_inexistente(client: TestClient):
    """POST /documentacion/ con un empleado inexistente debe responder 404 Not Found."""
    respuesta = client.post("/documentacion/", json=_payload_libreta(9999))
    assert respuesta.status_code == 404


def test_router_crear_documentacion_tipo_invalido(client: TestClient, db_session: Session):
    """POST /documentacion/ con un tipo fuera del enum debe responder 422."""
    empleado = _crear_empleado(db_session)
    payload = _payload_libreta(empleado.id)
    payload["tipo"] = "carnet_de_conducir"

    respuesta = client.post("/documentacion/", json=payload)
    assert respuesta.status_code == 422


def test_router_crear_documentacion_sin_campos_del_tipo(client: TestClient, db_session: Session):
    """POST /documentacion/ sin los campos propios del tipo debe responder 422."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post(
        "/documentacion/",
        json={
            "tipo": TipoDocumentacion.LIBRETA_SANITARIA.value,
            "empleado_id": empleado.id,
            "fecha_vencimiento": _fecha(100),
        },
    )
    assert respuesta.status_code == 422


def test_router_crear_documentacion_texto_demasiado_corto(client: TestClient, db_session: Session):
    """POST /documentacion/ con un numero de carnet de un solo caracter debe responder 422."""
    empleado = _crear_empleado(db_session)

    respuesta = client.post(
        "/documentacion/", json=_payload_libreta(empleado.id, numero_carnet="A")
    )
    assert respuesta.status_code == 422


def test_router_crear_documentacion_fecha_invalida(client: TestClient, db_session: Session):
    """POST /documentacion/ con una fecha mal formada debe responder 422."""
    empleado = _crear_empleado(db_session)
    payload = _payload_libreta(empleado.id)
    payload["fecha_vencimiento"] = "31-12-2026"

    respuesta = client.post("/documentacion/", json=payload)
    assert respuesta.status_code == 422


def test_router_crear_documentacion_archivo_invalido(client: TestClient, db_session: Session):
    """POST /documentacion/ con un adjunto que no es imagen ni PDF debe responder 400."""
    empleado = _crear_empleado(db_session)
    payload = _payload_libreta(empleado.id)
    payload["archivo_url"] = "data:text/plain;base64,aG9sYQ=="

    respuesta = client.post("/documentacion/", json=payload)
    assert respuesta.status_code == 400


def test_router_crear_libreta_carnet_duplicado(client: TestClient, db_session: Session):
    """POST /documentacion/ con un numero de carnet repetido debe responder 400."""
    empleado = _crear_empleado(db_session)
    _crear(client, _payload_libreta(empleado.id, numero_carnet="LS-UNICO"))

    respuesta = client.post(
        "/documentacion/", json=_payload_libreta(empleado.id, dias=100, numero_carnet="LS-UNICO")
    )
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.NUMERO_CARNET_DUPLICADO


def test_router_leer_documentacion_no_encontrada(client: TestClient):
    """GET /documentacion/{id} con ID inexistente debe responder 404 Not Found."""
    respuesta = client.get("/documentacion/9999")
    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == ErrorCode.DOCUMENTACION_NO_ENCONTRADA


def test_router_update_documentacion_no_encontrada(client: TestClient):
    """PUT /documentacion/{id} con ID inexistente debe responder 404 Not Found."""
    respuesta = client.put("/documentacion/9999", json={"fecha_vencimiento": _fecha(100)})
    assert respuesta.status_code == 404


def test_router_update_documentacion_sin_fecha(client: TestClient, db_session: Session):
    """PUT /documentacion/{id} sin la fecha de vencimiento debe responder 422."""
    empleado = _crear_empleado(db_session)
    creado = _crear(client, _payload_libreta(empleado.id))

    respuesta = client.put(f"/documentacion/{creado['id']}", json={"numero_carnet": "LS-9"})
    assert respuesta.status_code == 422


def test_router_delete_documentacion_no_encontrada(client: TestClient):
    """DELETE /documentacion/{id} con ID inexistente debe responder 404 Not Found."""
    respuesta = client.delete("/documentacion/9999")
    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == ErrorCode.DOCUMENTACION_NO_ENCONTRADA


def test_router_update_requisito_tipo_invalido(client: TestClient):
    """PUT /documentacion/requisitos/{tipo} con un tipo inexistente debe responder 422."""
    respuesta = client.put(
        "/documentacion/requisitos/carnet_de_conducir", json={"obligatorio": True}
    )
    assert respuesta.status_code == 422


def test_router_update_requisito_dias_fuera_de_rango(client: TestClient):
    """PUT /documentacion/requisitos/{tipo} con dias de aviso invalidos debe responder 422."""
    respuesta = client.put(
        "/documentacion/requisitos/capacitacion", json={"dias_aviso_previo": 0}
    )
    assert respuesta.status_code == 422

    respuesta = client.put(
        "/documentacion/requisitos/capacitacion", json={"dias_aviso_previo": 400}
    )
    assert respuesta.status_code == 422


def test_router_cumplimiento_de_empleado_inexistente(client: TestClient):
    """GET /documentacion/cumplimiento/{id} con un empleado inexistente debe responder 404."""
    respuesta = client.get("/documentacion/cumplimiento/9999")
    assert respuesta.status_code == 404
