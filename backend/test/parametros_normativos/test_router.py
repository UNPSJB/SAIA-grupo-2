from src.parametros_normativos.constants import ErrorCode

URL = "/parametros-normativos"


def _crear_borrador(client, admin):
    return client.post(f"{URL}/borradores", json={"empleado_id": admin.id})


def test_listar_y_leer_vigente(client, vigente):
    respuesta = client.get(f"{URL}/")
    assert respuesta.status_code == 200
    assert respuesta.json()[0]["vigente"] is True

    detalle = client.get(f"{URL}/vigente").json()
    assert detalle["version"] == 1
    assert len(detalle["criterios"]) == 13
    assert len(detalle["excepciones"]) == 10


def test_sin_parametros_vigentes_devuelve_error(client):
    respuesta = client.get(f"{URL}/vigente")
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.SIN_PARAMETROS_VIGENTES


def test_ciclo_completo_de_borrador(client, admin, vigente):
    borrador = _crear_borrador(client, admin)
    assert borrador.status_code == 200
    datos = borrador.json()
    assert datos["estado"] == "borrador"
    assert datos["creado_por"]["id"] == admin.id

    criterio = datos["criterios"][0]
    modificado = client.put(
        f"{URL}/{datos['id']}",
        json={"criterios": [{"id": criterio["id"], "limite": 11, "factor_energetico": 4}], "notas": "Revisión"},
    )
    assert modificado.status_code == 200
    assert modificado.json()["criterios"][0]["limite"] == 11

    publicado = client.post(f"{URL}/{datos['id']}/publicar", json={"empleado_id": admin.id})
    assert publicado.status_code == 200
    assert publicado.json()["estado"] == "publicado"
    assert publicado.json()["vigente"] is True

    rechazo = client.put(f"{URL}/{datos['id']}", json={"notas": "otra"})
    assert rechazo.status_code == 400
    assert rechazo.json()["detail"] == ErrorCode.CONJUNTO_PUBLICADO

    assert client.get(f"{URL}/{vigente.id}").json()["criterios"][0]["limite"] == 10


def test_descartar_borrador(client, admin, vigente):
    borrador = _crear_borrador(client, admin).json()
    assert client.delete(f"{URL}/{borrador['id']}").status_code == 204
    assert client.get(f"{URL}/{borrador['id']}").status_code == 404


def test_segundo_borrador_es_rechazado(client, admin, vigente):
    _crear_borrador(client, admin)
    respuesta = _crear_borrador(client, admin)
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.BORRADOR_EXISTENTE


def test_texto_demasiado_largo_es_rechazado(client, admin, vigente):
    borrador = _crear_borrador(client, admin).json()
    respuesta = client.put(f"{URL}/{borrador['id']}", json={"textos": [{"sello": "exceso_sodio", "texto": "X" * 121}]})
    assert respuesta.status_code == 422


def test_interruptor_del_modulo(client, admin):
    assert client.get(f"{URL}/modulo-rotulado-frontal").json()["activo"] is True
    respuesta = client.put(f"{URL}/modulo-rotulado-frontal", json={"activo": False, "empleado_id": admin.id})
    assert respuesta.status_code == 200
    assert respuesta.json()["activo"] is False
    assert respuesta.json()["cambiado_por"]["id"] == admin.id


def test_empleado_inexistente_no_puede_crear_borrador(client, vigente):
    assert client.post(f"{URL}/borradores", json={"empleado_id": 999}).status_code == 404
