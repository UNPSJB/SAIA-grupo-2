import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.aditivos import exceptions, schemas, services

ADMIN = {"X-User-Role": "admin"}
OPERARIO = {"X-User-Role": "operario"}


def _clase(db: Session, nombre: str, necesita_ins: bool = True):
    return services.crear_clase_funcional_aditivo(
        db, schemas.ClaseFuncionalAditivoCreate(nombre=nombre, necesita_ins=necesita_ins)
    )


def _aditivo(db: Session, clase_id: int, nombre: str, ins: str):
    return services.crear_aditivo(
        db, schemas.AditivoCreate(nombre_completo=nombre, clase_funcional_id=clase_id, numero_ins=ins)
    )


def test_modificar_nombre_y_si_necesita_ins(db_session: Session):
    clase = _clase(db_session, "Saborizante")

    modificada = services.modificar_clase_funcional(
        db_session, clase.id, schemas.ClaseFuncionalAditivoUpdate(nombre="Aromatizante", necesita_ins=False)
    )

    assert modificada.nombre.lower() == "aromatizante"
    assert modificada.necesita_ins is False


def test_no_se_modifica_una_clase_con_aditivos(db_session: Session):
    clase = _clase(db_session, "Conservante")
    _aditivo(db_session, clase.id, "Sorbato de potasio", "202")

    with pytest.raises(exceptions.ClaseFuncionalConAditivos):
        services.modificar_clase_funcional(
            db_session, clase.id, schemas.ClaseFuncionalAditivoUpdate(nombre="Conservador", necesita_ins=True)
        )


def test_no_se_renombra_con_el_nombre_de_otra_clase(db_session: Session):
    _clase(db_session, "Emulsionante")
    clase = _clase(db_session, "Espesante")

    with pytest.raises(exceptions.ClaseFuncionalDuplicada):
        services.modificar_clase_funcional(
            db_session, clase.id, schemas.ClaseFuncionalAditivoUpdate(nombre="Emulsionante", necesita_ins=True)
        )


def test_consultas_de_clases_y_aditivos(db_session: Session):
    clase = _clase(db_session, "Leudante")
    otra = _clase(db_session, "Colorante")
    bicarbonato = _aditivo(db_session, clase.id, "Bicarbonato de sodio", "500ii")
    _aditivo(db_session, otra.id, "Caramelo", "150a")

    assert services.leer_clase_funcional(db_session, clase.id).nombre.lower() == "leudante"
    assert [a.id for a in services.listar_aditivos_de_clase(db_session, clase.id)] == [bicarbonato.id]
    assert services.leer_aditivo(db_session, bicarbonato.id).numero_ins == "500ii"


def test_clase_o_aditivo_inexistente(db_session: Session):
    with pytest.raises(exceptions.ClaseFuncionalNoEncontrada):
        services.leer_clase_funcional(db_session, 999)
    with pytest.raises(exceptions.AditivoNoEncontrado):
        services.leer_aditivo(db_session, 999)
    with pytest.raises(exceptions.ClaseFuncionalNoEncontrada):
        _aditivo(db_session, 999, "Sin clase", "100")


def test_router_solo_el_administrador_gestiona(client: TestClient, db_session: Session):
    clase = _clase(db_session, "Antioxidante")

    assert client.post("/clases-funcionales/", json={"nombre": "Otra", "necesita_ins": True}).status_code == 403
    assert client.post("/clases-funcionales/", json={"nombre": "Otra", "necesita_ins": True}, headers=OPERARIO).status_code == 403
    assert client.put(
        f"/clases-funcionales/{clase.id}", json={"nombre": "Otra", "necesita_ins": True}, headers=OPERARIO
    ).status_code == 403
    assert client.post(
        "/aditivos/", json={"nombre_completo": "Ácido ascórbico", "clase_funcional_id": clase.id, "numero_ins": "300"}
    ).status_code == 403


def test_router_modificar_y_consultar(client: TestClient, db_session: Session):
    clase = _clase(db_session, "Antiaglutinante")

    modificada = client.put(
        f"/clases-funcionales/{clase.id}", json={"nombre": "Antihumectante", "necesita_ins": True}, headers=ADMIN
    )
    assert modificada.status_code == 200
    assert client.get(f"/clases-funcionales/{clase.id}").json()["nombre"].lower() == "antihumectante"

    creado = client.post(
        "/aditivos/",
        json={"nombre_completo": "Dióxido de silicio", "clase_funcional_id": clase.id, "numero_ins": "551"},
        headers=ADMIN,
    ).json()
    assert client.get(f"/aditivos/{creado['id']}").json()["numero_ins"] == "551"
    assert [a["id"] for a in client.get(f"/clases-funcionales/{clase.id}/aditivos").json()] == [creado["id"]]
    assert client.get("/aditivos/999").status_code == 404
    assert client.get("/clases-funcionales/999").status_code == 404
