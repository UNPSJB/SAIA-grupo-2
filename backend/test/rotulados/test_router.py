from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from test.rotulados.conftest import DATOS_COMPLETOS, crear_lote


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


def test_consultas_del_rotulo(client: TestClient, db_session: Session, producto, otro_producto, admin):
    rotulo_id = _crear(client, producto, admin.id).json()["id"]

    assert [r["id"] for r in client.get("/rotulos/").json()] == [rotulo_id]
    assert client.get(f"/rotulos/{rotulo_id}").json()["producto_id"] == producto.id
    assert client.get(f"/rotulos/producto/{producto.id}").json()["id"] == rotulo_id
    assert client.get(f"/rotulos/producto/{otro_producto.id}").json() is None
    assert client.get("/rotulos/999").status_code == 404
    assert client.get("/rotulos/producto/999").status_code == 404


def test_empleado_inactivo_o_inexistente(client: TestClient, db_session: Session, producto, admin):
    admin.activo = False
    db_session.commit()

    assert _crear(client, producto, admin.id).status_code == 401
    assert _crear(client, producto, 999).status_code == 401


def test_lotes_y_datos_automaticos_por_la_api(client: TestClient, db_session: Session, producto, receta, admin):
    rotulo_id = _crear(client, producto, admin.id).json()["id"]
    lote = crear_lote(db_session, producto)
    encabezado = {"X-User-Id": str(admin.id)}

    asociado = client.post(f"/rotulos/{rotulo_id}/lotes", json={"nro_lote": lote.nro_lote}, headers=encabezado)
    assert asociado.status_code == 201
    rotulo_lote_id = asociado.json()["id"]
    assert [l["nro_lote"] for l in client.get(f"/rotulos/{rotulo_id}/lotes").json()] == [lote.nro_lote]

    fecha = client.patch(f"/rotulos/lotes/{rotulo_lote_id}", json={"fecha_duracion": "2027-01-10"}, headers=encabezado)
    assert fecha.status_code == 200
    assert fecha.json()["fecha_duracion"] == "2027-01-10"
    sin_cambios = client.patch(f"/rotulos/lotes/{rotulo_lote_id}", json={"fecha_duracion": "2027-01-10"}, headers=encabezado)
    assert sin_cambios.status_code == 200
    assert len([c for c in client.get(f"/rotulos/{rotulo_id}/historial").json() if c["campo"].startswith("lote:")]) == 1
    assert client.patch("/rotulos/lotes/999", json={"fecha_duracion": "2027-01-10"}, headers=encabezado).status_code == 404

    actualizado = client.post(f"/rotulos/{rotulo_id}/actualizar-snapshots", headers=encabezado)
    assert actualizado.status_code == 200
    assert actualizado.json()["receta_version"] == 1
    assert client.get("/rotulos/999/lotes").status_code == 404
