from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.checklists.constants import ErrorCode
from src.planes.models import Plan
from src.sectores.models import Sector
from src.tareas.constants import FrecuenciaTarea
from src.tareas.models import Tarea

LUNES = date(2026, 6, 1)
URL = "/checklists/cumplimiento"


def _crear_plan(db: Session) -> Plan:
    """Crea un plan con una tarea diaria sobre la misma sesion que usa el client."""
    plan = Plan(
        titulo="plan router test",
        fecha_inicio=LUNES,
        sector=Sector(nombre="sector router test"),
        tareas=[Tarea(titulo="tarea router test", frecuencia=FrecuenciaTarea.DIARIA)],
    )
    db.add(plan)
    db.commit()
    return plan


def test_router_cumplimiento_por_dia(client: TestClient, db_session: Session):
    _crear_plan(db_session)

    respuesta = client.get(
        URL,
        params={"fecha_desde": str(LUNES), "fecha_hasta": str(LUNES + timedelta(days=1))},
    )

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["granularidad"] == "dia"
    assert cuerpo["fecha_desde"] == "2026-06-01"
    assert [item["periodo"] for item in cuerpo["serie"]] == ["2026-06-01", "2026-06-02"]
    assert cuerpo["serie"][0] == {
        "periodo": "2026-06-01",
        "esperadas": 1,
        "realizadas": 0,
        "porcentaje": 0.0,
    }


def test_router_cumplimiento_por_semana(client: TestClient, db_session: Session):
    _crear_plan(db_session)

    respuesta = client.get(
        URL,
        params={
            "fecha_desde": str(LUNES),
            "fecha_hasta": str(LUNES + timedelta(days=8)),
            "granularidad": "semana",
        },
    )

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["granularidad"] == "semana"
    assert [item["periodo"] for item in cuerpo["serie"]] == ["2026-06-01", "2026-06-08"]
    assert [item["esperadas"] for item in cuerpo["serie"]] == [7, 2]


def test_router_cumplimiento_sin_tareas_devuelve_porcentaje_nulo(client: TestClient):
    respuesta = client.get(URL, params={"fecha_desde": str(LUNES), "fecha_hasta": str(LUNES)})

    assert respuesta.status_code == 200
    assert respuesta.json()["serie"][0]["porcentaje"] is None


def test_router_cumplimiento_rango_invalido(client: TestClient):
    respuesta = client.get(
        URL,
        params={"fecha_desde": str(LUNES + timedelta(days=1)), "fecha_hasta": str(LUNES)},
    )

    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.RANGO_FECHAS_INVALIDO


def test_router_cumplimiento_granularidad_invalida(client: TestClient):
    respuesta = client.get(
        URL,
        params={"fecha_desde": str(LUNES), "fecha_hasta": str(LUNES), "granularidad": "mes"},
    )

    assert respuesta.status_code == 422


def test_router_cumplimiento_exige_las_fechas(client: TestClient):
    respuesta = client.get(URL, params={"fecha_desde": str(LUNES)})

    assert respuesta.status_code == 422
