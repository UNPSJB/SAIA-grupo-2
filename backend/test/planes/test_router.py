from datetime import date, timedelta

import pytest

from src.planes import exceptions
from src.sectores.models import Sector
from src.equipos.models import Equipo, TipoEquipo
from src.equipos.constants import EstadoEquipo
from src.tareas.models import Tarea
from src.tareas.constants import FrecuenciaTarea


def crear_datos_base(db_session):
    sector = Sector(nombre="Sector de prueba")
    tipo_equipo = TipoEquipo(nombre="Heladera")

    db_session.add_all([sector, tipo_equipo])
    db_session.flush()

    equipo = Equipo(
        nombre="Heladera de prueba",
        sector_id=sector.id,
        tipo_id=tipo_equipo.id,
        estado=EstadoEquipo.BUENO,
        activo=True,
    )

    tarea = Tarea(
        titulo="Limpiar heladera",
        frecuencia=FrecuenciaTarea.DIARIA,
        activo=True,
    )

    db_session.add_all([equipo, tarea])
    db_session.flush()

    return sector, equipo, tarea


def crear_plan_payload(sector, equipo, tarea, titulo="Plan de prueba"):
    return {
        "titulo": titulo,
        "fecha_inicio": "2026-01-01",
        "fecha_fin": "2026-12-31",
        "sector_id": sector.id,
        "equipos_ids": [equipo.id],
        "tareas_ids": [tarea.id],
    }


def test_listar_planes_sin_registros(client):
    respuesta = client.get("/planes/")

    assert respuesta.status_code == 200
    assert respuesta.json() == []


def test_listar_planes_con_registros(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)

    payload = crear_plan_payload(sector, equipo, tarea)

    respuesta_creacion = client.post("/planes/", json=payload)
    assert respuesta_creacion.status_code == 200

    respuesta = client.get("/planes/")

    assert respuesta.status_code == 200
    assert len(respuesta.json()) == 1
    assert respuesta.json()[0]["titulo"] == "Plan de prueba"


def test_consultar_plan_inexistente(client):
    respuesta = client.get("/planes/9999")

    assert respuesta.status_code == 404



def test_crear_plan_correctamente(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    payload = crear_plan_payload(sector, equipo, tarea)

    respuesta = client.post("/planes/", json=payload)

    assert respuesta.status_code == 200
    datos = respuesta.json()

    assert datos["id"] is not None
    assert datos["titulo"] == "Plan de prueba"
    assert datos["sector"]["id"] == sector.id
    assert len(datos["equipos"]) == 1
    assert len(datos["tareas"]) == 1


def test_crear_plan_con_fechas_invalidas(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    payload = crear_plan_payload(sector, equipo, tarea)

    payload["fecha_inicio"] = "2026-12-31"
    payload["fecha_fin"] = "2026-01-01"

    respuesta = client.post("/planes/", json=payload)

    assert respuesta.status_code == 422


def test_modificar_plan_correctamente(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    payload = crear_plan_payload(sector, equipo, tarea)

    respuesta_creacion = client.post("/planes/", json=payload)
    assert respuesta_creacion.status_code == 200

    plan_id = respuesta_creacion.json()["id"]

    payload["titulo"] = "Plan modificado"
    payload["fecha_fin"] = "2027-12-31"

    respuesta = client.put(f"/planes/{plan_id}", json=payload)

    assert respuesta.status_code == 200
    datos = respuesta.json()

    assert datos["id"] == plan_id
    assert datos["titulo"] == "Plan modificado"
    assert datos["fecha_fin"] == "2027-12-31"


def test_modificar_plan_inexistente(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    payload = crear_plan_payload(sector, equipo, tarea)

    respuesta = client.put("/planes/9999", json=payload)

    assert respuesta.status_code == 404



def test_modificar_plan_con_titulo_duplicado(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)

    payload1 = crear_plan_payload(sector, equipo, tarea, "Plan original")
    payload2 = crear_plan_payload(sector, equipo, tarea, "Otro plan")

    respuesta1 = client.post("/planes/", json=payload1)
    respuesta2 = client.post("/planes/", json=payload2)

    assert respuesta1.status_code == 200
    assert respuesta2.status_code == 200

    plan_id = respuesta1.json()["id"]
    payload1["titulo"] = "Otro plan"

    respuesta = client.put(f"/planes/{plan_id}", json=payload1)

    assert respuesta.status_code == 400


def test_modificar_plan_con_fechas_invalidas(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    payload = crear_plan_payload(sector, equipo, tarea)

    creacion = client.post("/planes/", json=payload)
    plan_id = creacion.json()["id"]

    payload["fecha_inicio"] = "2026-12-31"
    payload["fecha_fin"] = "2026-01-01"

    respuesta = client.put(f"/planes/{plan_id}", json=payload)

    assert respuesta.status_code == 422



def test_eliminar_plan_inexistente(client):
    respuesta = client.delete("/planes/9999")

    assert respuesta.status_code == 404


def test_eliminar_plan_activo(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    payload = crear_plan_payload(sector, equipo, tarea)

    creacion = client.post("/planes/", json=payload)
    plan_id = creacion.json()["id"]

    respuesta = client.delete(f"/planes/{plan_id}")

    assert respuesta.status_code == 400


def test_eliminar_plan_desactivado_hace_menos_de_7_dias(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    payload = crear_plan_payload(sector, equipo, tarea)

    payload["activo"] = False
    payload["fecha_desactivacion"] = date.today().isoformat()

    creacion = client.post("/planes/", json=payload)
    assert creacion.status_code == 200

    plan_id = creacion.json()["id"]

    respuesta = client.delete(f"/planes/{plan_id}")

    assert respuesta.status_code == 400


def test_eliminar_plan_desactivado_hace_7_dias_o_mas(client, db_session):
    sector, equipo, tarea = crear_datos_base(db_session)
    payload = crear_plan_payload(sector, equipo, tarea)

    payload["activo"] = False
    payload["fecha_desactivacion"] = (
        date.today() - timedelta(days=7)
    ).isoformat()

    creacion = client.post("/planes/", json=payload)
    assert creacion.status_code == 200

    plan_id = creacion.json()["id"]

    respuesta = client.delete(f"/planes/{plan_id}")

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == plan_id
    assert respuesta.json()["msg"]

    consulta = client.get(f"/planes/{plan_id}")
    assert consulta.status_code == 404
