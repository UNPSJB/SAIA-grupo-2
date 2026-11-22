from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.aditivos import services, schemas

HEADERS_ADMIN = {"X-User-Role": "admin"}

def test_router_crear_y_listar_clases_funcionales(client: TestClient, db_session: Session):
    res_post = client.post(
        "/clases-funcionales/",
        json={"nombre": "Estabilizante Router", "necesita_ins": True},
        headers=HEADERS_ADMIN
    )
    assert res_post.status_code == status.HTTP_200_OK
    assert res_post.json()["nombre"].lower() == "estabilizante router"

    res_get = client.get("/clases-funcionales/")
    assert res_get.status_code == status.HTTP_200_OK
    nombres = [c["nombre"].lower() for c in res_get.json()]
    assert "estabilizante router" in nombres

def test_router_crear_y_listar_aditivos(client: TestClient, db_session: Session):
    cf = services.crear_clase_funcional_aditivo(
        db_session,
        schemas.ClaseFuncionalAditivoCreate(nombre="Acidulante Router", necesita_ins=True)
    )

    res_post = client.post(
        "/aditivos/",
        json={"nombre_completo": "Ácido Cítrico", "clase_funcional_id": cf.id, "numero_ins": "330"},
        headers=HEADERS_ADMIN
    )
    assert res_post.status_code == status.HTTP_200_OK
    assert res_post.json()["nombre_completo"] == "Ácido Cítrico"

    res_get = client.get("/aditivos/")
    assert res_get.status_code == status.HTTP_200_OK
    aditivos = res_get.json()
    assert any(a["nombre_completo"] == "Ácido Cítrico" for a in aditivos)
