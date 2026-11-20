from src.parametros_normativos.constants import ErrorCode as ErrorParametros
from src.rotulado_frontal.constants import ErrorCode

URL = "/rotulado-frontal"


def test_evaluar_y_consultar_un_producto(client, admin, vigente, galletitas):
    respuesta = client.post(
        f"{URL}/productos/{galletitas.id}",
        json={"empleado_id": admin.id, "envasado_en_ausencia_del_cliente": True, "agrega_grasas": True},
    )
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["resultado"] == "corresponde"
    assert datos["parametros"]["version"] == 1
    assert datos["evaluado_por"]["id"] == admin.id
    assert [s["sello"] for s in datos["sellos_a_evaluar"]] == [
        "exceso_grasas_totales",
        "exceso_grasas_saturadas",
        "exceso_calorias",
    ]

    estado = client.get(f"{URL}/productos/{galletitas.id}").json()
    assert estado["evaluacion"]["id"] == datos["id"]
    assert len(client.get(f"{URL}/productos/{galletitas.id}/historial").json()) == 1


def test_producto_sin_evaluar(client, vigente, galletitas):
    estado = client.get(f"{URL}/productos/{galletitas.id}").json()
    assert estado["producto"]["nombre"] == "Galletitas de avena"
    assert estado["evaluacion"] is None
    assert len(client.get(f"{URL}/").json()) == 1


def test_excepcion_invalida(client, admin, vigente, galletitas):
    respuesta = client.post(
        f"{URL}/productos/{galletitas.id}",
        json={"empleado_id": admin.id, "envasado_en_ausencia_del_cliente": True, "excepcion": "Otra"},
    )
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.EXCEPCION_INVALIDA


def test_falta_la_respuesta_sobre_el_envasado(client, admin, vigente, galletitas):
    respuesta = client.post(f"{URL}/productos/{galletitas.id}", json={"empleado_id": admin.id})
    assert respuesta.status_code == 422


def test_modulo_desactivado(client, admin, vigente, galletitas):
    client.put("/parametros-normativos/modulo-rotulado-frontal", json={"activo": False, "empleado_id": admin.id})
    respuesta = client.get(f"{URL}/")
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorParametros.MODULO_DESACTIVADO
    assert client.get("/productos/").status_code == 200


def test_producto_inexistente(client, vigente):
    assert client.get(f"{URL}/productos/999").status_code == 404
