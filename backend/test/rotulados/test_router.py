from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from test.rotulados.conftest import DATOS_COMPLETOS


def _crear(client: TestClient, producto, empleado_id: int):
    return client.post(
        "/rotulos/", json={"producto_id": producto.id, **DATOS_COMPLETOS}, headers={"X-User-Id": str(empleado_id)}
    )


def test_crear_requiere_identificar_al_empleado(client: TestClient, db_session: Session, producto):
    assert client.post("/rotulos/", json={"producto_id": producto.id}).status_code == 401


def test_operario_no_puede_crear(client: TestClient, db_session: Session, producto, operario):
    assert _crear(client, producto, operario.id).status_code == 403


def test_crear_editar_y_previsualizar(client: TestClient, db_session: Session, producto, receta, admin):
    creado = _crear(client, producto, admin.id)
    assert creado.status_code == 201
    rotulo_id = creado.json()["id"]
    assert creado.json()["lista_ingredientes"].startswith("Ingredientes:")

    editado = client.patch(
        f"/rotulos/{rotulo_id}", json={"lista_ingredientes": "Ingredientes: harina, azúcar."},
        headers={"X-User-Id": str(admin.id)},
    )
    assert editado.status_code == 200
    historial = client.get(f"/rotulos/{rotulo_id}/historial").json()
    assert historial[0]["campo"] == "lista_ingredientes"
    assert historial[0]["empleado_nombre"] == "Ana"

    completitud = client.get(f"/rotulos/{rotulo_id}/completitud").json()
    assert completitud["faltantes"] == ["Evaluación de rotulado frontal", "Asociación a un lote de producción"]

    vista = client.get(f"/rotulos/{rotulo_id}/vista-previa")
    assert vista.status_code == 200
    cuerpo = vista.json()
    assert cuerpo["leyenda_borrador"].startswith("BORRADOR:")
    assert cuerpo["lista_ingredientes"] == "Ingredientes: harina, azúcar."
    assert cuerpo["completo"] is False


def test_vista_previa_de_rotulo_inexistente(client: TestClient, db_session: Session):
    assert client.get("/rotulos/999/vista-previa").status_code == 404
