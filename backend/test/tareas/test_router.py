from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.planes.models import Plan
from src.productos_limpieza.constants import TipoProductoLimpieza
from src.productos_limpieza.models import ProductoLimpieza
from src.sectores.models import Sector
from src.tareas.constants import ErrorCode
from src.unidades_medida.models import UnidadMedida


def _crear_plan(db: Session, titulo: str = "plan tarea test") -> Plan:
    """Crea el sector y el plan sobre la misma sesion que usa el client."""
    sector = Sector(nombre=f"sector de {titulo}")
    db.add(sector)
    db.commit()
    db.refresh(sector)

    plan = Plan(titulo=titulo, fecha_inicio=date(2026, 1, 1), sector_id=sector.id)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def _crear_producto(
    db: Session,
    nombre: str = "producto tarea test",
    stock: float = 10,
    activo: bool = True,
) -> ProductoLimpieza:
    """Crea un producto de limpieza con su unidad de medida."""
    unidad = UnidadMedida(nombre=f"unidad de {nombre}")
    db.add(unidad)
    db.commit()
    db.refresh(unidad)

    producto = ProductoLimpieza(
        nombre=nombre,
        tipo=TipoProductoLimpieza.DETERGENTE,
        stock=stock,
        activo=activo,
        unidad_medida_id=unidad.id,
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def _payload(
    planes: list[int],
    titulo: str = "tarea router test",
    frecuencia: str = "diaria",
    activo: bool = True,
    consumos: list[dict] | None = None,
) -> dict:
    """Arma el cuerpo que espera el endpoint de tareas."""
    return {
        "titulo": titulo,
        "frecuencia": frecuencia,
        "activo": activo,
        "planes": planes,
        "consumos_estimados": consumos or [],
    }


def _crear_tarea(client: TestClient, planes: list[int], titulo: str = "tarea router test") -> dict:
    """Crea una tarea por el endpoint y devuelve el cuerpo de la respuesta."""
    respuesta = client.post("/tareas/", json=_payload(planes, titulo))
    assert respuesta.status_code == 200
    return respuesta.json()


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - ROUTER)

def test_router_crear_tarea_exito(client: TestClient, db_session: Session):
    """POST /tareas/ debe responder 200 OK y crear la tarea."""
    plan = _crear_plan(db_session)

    respuesta = client.post("/tareas/", json=_payload([plan.id], "limpieza de camara test"))
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert "id" in data
    assert data["titulo"] == "limpieza de camara test"
    assert data["frecuencia"] == "diaria"
    assert data["activo"] is True
    assert [p["id"] for p in data["planes"]] == [plan.id]


def test_router_crear_tarea_con_consumo(client: TestClient, db_session: Session):
    """POST /tareas/ debe aceptar los consumos estimados de productos."""
    plan = _crear_plan(db_session)
    producto = _crear_producto(db_session)

    respuesta = client.post(
        "/tareas/",
        json=_payload(
            [plan.id],
            consumos=[{"producto_limpieza_id": producto.id, "cantidad": 2.5}],
        ),
    )
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data["consumos_estimados"]) == 1
    assert data["consumos_estimados"][0]["cantidad"] == 2.5


def test_router_listar_tareas(client: TestClient, db_session: Session):
    """GET /tareas/ debe responder 200 OK y devolver una lista."""
    plan = _crear_plan(db_session)
    _crear_tarea(client, [plan.id], "tarea 1 test")
    _crear_tarea(client, [plan.id], "tarea 2 test")

    respuesta = client.get("/tareas/")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert isinstance(data, list)
    assert len(data) == 2


def test_router_listar_tareas_filtra_por_plan(client: TestClient, db_session: Session):
    """GET /tareas/?plan_id= debe devolver solo las tareas de ese plan."""
    uno = _crear_plan(db_session, "plan uno test")
    otro = _crear_plan(db_session, "plan dos test")
    _crear_tarea(client, [uno.id], "tarea del uno test")
    _crear_tarea(client, [otro.id], "tarea del dos test")

    respuesta = client.get(f"/tareas/?plan_id={uno.id}")
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert len(data) == 1
    assert data[0]["titulo"] == "tarea del uno test"


def test_router_read_tarea_exito(client: TestClient, db_session: Session):
    """GET /tareas/{id} debe responder 200 OK."""
    plan = _crear_plan(db_session)
    creada = _crear_tarea(client, [plan.id], "tarea a leer test")

    respuesta = client.get(f"/tareas/{creada['id']}")
    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == creada["id"]


def test_router_impacto_tarea(client: TestClient, db_session: Session):
    """GET /tareas/{id}/impacto debe devolver los titulos de los planes afectados."""
    uno = _crear_plan(db_session, "plan uno test")
    otro = _crear_plan(db_session, "plan dos test")
    creada = _crear_tarea(client, [uno.id, otro.id])

    respuesta = client.get(f"/tareas/{creada['id']}/impacto")
    assert respuesta.status_code == 200
    assert sorted(respuesta.json()) == ["plan dos test", "plan uno test"]


def test_router_update_tarea_exito(client: TestClient, db_session: Session):
    """PUT /tareas/{id} debe responder 200 OK y actualizar la tarea."""
    plan = _crear_plan(db_session)
    creada = _crear_tarea(client, [plan.id], "titulo viejo test")

    respuesta = client.put(
        f"/tareas/{creada['id']}",
        json=_payload([plan.id], "titulo nuevo test", frecuencia="semanal"),
    )
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["titulo"] == "titulo nuevo test"
    assert data["frecuencia"] == "semanal"


def test_router_baja_logica_desasocia_los_planes(client: TestClient, db_session: Session):
    """PUT /tareas/{id} con activo=False debe sacar la tarea de sus planes."""
    plan = _crear_plan(db_session)
    creada = _crear_tarea(client, [plan.id])

    respuesta = client.put(
        f"/tareas/{creada['id']}",
        json=_payload([plan.id], activo=False),
    )
    assert respuesta.status_code == 200
    data = respuesta.json()
    assert data["activo"] is False
    assert data["planes"] == []


def test_router_delete_tarea_inactiva_exito(client: TestClient, db_session: Session):
    """DELETE /tareas/{id} sobre una tarea dada de baja debe responder 200 OK."""
    plan = _crear_plan(db_session)
    creada = _crear_tarea(client, [plan.id])
    client.put(f"/tareas/{creada['id']}", json=_payload([plan.id], activo=False))

    respuesta = client.delete(f"/tareas/{creada['id']}")
    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == creada["id"]
    assert respuesta.json()["msg"] == "borrado"

    assert client.get(f"/tareas/{creada['id']}").status_code == 404


# PRUEBAS NEGATIVAS (CASOS DE FALLA - ROUTER)

def test_router_crear_tarea_sin_planes(client: TestClient):
    """POST /tareas/ sin planes debe responder 400 Bad Request."""
    respuesta = client.post("/tareas/", json=_payload([]))
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.SIN_PLANES


def test_router_crear_tarea_plan_inexistente(client: TestClient):
    """POST /tareas/ con un plan inexistente debe responder 404 Not Found."""
    respuesta = client.post("/tareas/", json=_payload([9999]))
    assert respuesta.status_code == 404


def test_router_crear_tarea_titulo_vacio(client: TestClient, db_session: Session):
    """POST /tareas/ con titulo vacio debe responder 422 Unprocessable Content."""
    plan = _crear_plan(db_session)

    respuesta = client.post("/tareas/", json=_payload([plan.id], titulo=""))
    assert respuesta.status_code == 422


def test_router_crear_tarea_frecuencia_invalida(client: TestClient, db_session: Session):
    """POST /tareas/ con una frecuencia fuera del enum debe responder 422."""
    plan = _crear_plan(db_session)

    respuesta = client.post("/tareas/", json=_payload([plan.id], frecuencia="mensual"))
    assert respuesta.status_code == 422


def test_router_crear_tarea_payload_incompleto(client: TestClient):
    """POST /tareas/ sin frecuencia debe responder 422 Unprocessable Content."""
    respuesta = client.post("/tareas/", json={"titulo": "tarea incompleta test", "planes": [1]})
    assert respuesta.status_code == 422


def test_router_crear_tarea_cantidad_cero(client: TestClient, db_session: Session):
    """POST /tareas/ con un consumo de cantidad cero debe responder 422."""
    plan = _crear_plan(db_session)
    producto = _crear_producto(db_session)

    respuesta = client.post(
        "/tareas/",
        json=_payload(
            [plan.id],
            consumos=[{"producto_limpieza_id": producto.id, "cantidad": 0}],
        ),
    )
    assert respuesta.status_code == 422


def test_router_crear_tarea_producto_repetido(client: TestClient, db_session: Session):
    """POST /tareas/ con el mismo producto dos veces debe responder 400."""
    plan = _crear_plan(db_session)
    producto = _crear_producto(db_session)

    respuesta = client.post(
        "/tareas/",
        json=_payload(
            [plan.id],
            consumos=[
                {"producto_limpieza_id": producto.id, "cantidad": 1},
                {"producto_limpieza_id": producto.id, "cantidad": 2},
            ],
        ),
    )
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.PRODUCTO_REPETIDO


def test_router_crear_tarea_producto_sin_stock(client: TestClient, db_session: Session):
    """POST /tareas/ con un producto sin stock debe responder 400."""
    plan = _crear_plan(db_session)
    producto = _crear_producto(db_session, "producto sin stock test", stock=0)

    respuesta = client.post(
        "/tareas/",
        json=_payload(
            [plan.id],
            consumos=[{"producto_limpieza_id": producto.id, "cantidad": 1}],
        ),
    )
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.SIN_STOCK


def test_router_crear_tarea_producto_inactivo(client: TestClient, db_session: Session):
    """POST /tareas/ con un producto dado de baja debe responder 400."""
    plan = _crear_plan(db_session)
    producto = _crear_producto(db_session, "producto inactivo test", activo=False)

    respuesta = client.post(
        "/tareas/",
        json=_payload(
            [plan.id],
            consumos=[{"producto_limpieza_id": producto.id, "cantidad": 1}],
        ),
    )
    assert respuesta.status_code == 400
    assert "inactivo" in respuesta.json()["detail"]


def test_router_read_tarea_no_encontrada(client: TestClient):
    """GET /tareas/{id} con ID inexistente debe responder 404 Not Found."""
    respuesta = client.get("/tareas/9999")
    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == ErrorCode.TAREA_NO_ENCONTRADA


def test_router_impacto_tarea_no_encontrada(client: TestClient):
    """GET /tareas/{id}/impacto con ID inexistente debe responder 404 Not Found."""
    respuesta = client.get("/tareas/9999/impacto")
    assert respuesta.status_code == 404


def test_router_update_tarea_no_encontrada(client: TestClient):
    """PUT /tareas/{id} con ID inexistente debe responder 404 Not Found."""
    respuesta = client.put("/tareas/9999", json=_payload([1]))
    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == ErrorCode.TAREA_NO_ENCONTRADA


def test_router_update_tarea_activa_sin_planes(client: TestClient, db_session: Session):
    """PUT /tareas/{id} dejando la tarea activa sin planes debe responder 400."""
    plan = _crear_plan(db_session)
    creada = _crear_tarea(client, [plan.id])

    respuesta = client.put(f"/tareas/{creada['id']}", json=_payload([]))
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.SIN_PLANES


def test_router_delete_tarea_activa_falla(client: TestClient, db_session: Session):
    """DELETE /tareas/{id} sobre una tarea activa debe responder 400."""
    plan = _crear_plan(db_session)
    creada = _crear_tarea(client, [plan.id])

    respuesta = client.delete(f"/tareas/{creada['id']}")
    assert respuesta.status_code == 400
    assert "baja lógica" in respuesta.json()["detail"]


def test_router_delete_tarea_no_encontrada(client: TestClient):
    """DELETE /tareas/{id} con ID inexistente debe responder 404 Not Found."""
    respuesta = client.delete("/tareas/9999")
    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == ErrorCode.TAREA_NO_ENCONTRADA
