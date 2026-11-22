from src.alergenos.constants import ErrorCode

URL = "/alergenos"


def test_marcas_de_insumos(client, admin, insumos):
    respuesta = client.put(
        f"{URL}/insumos",
        json={"empleado_id": admin.id, "marcas": [{"insumo_id": insumos["Manteca"].id, "alergenos": ["leche"]}]},
    )
    assert respuesta.status_code == 200
    assert {m["insumo"]["nombre"]: m["alergenos"] for m in respuesta.json()}["Manteca"] == ["leche"]
    assert len(client.get(f"{URL}/insumos").json()) == 5


def test_alergeno_desconocido_es_rechazado(client, admin, insumos):
    respuesta = client.put(
        f"{URL}/insumos",
        json={"empleado_id": admin.id, "marcas": [{"insumo_id": insumos["Manteca"].id, "alergenos": ["apio"]}]},
    )
    assert respuesta.status_code == 422


def test_declarar_y_conservar(client, admin, medialunas):
    detalle = client.get(f"{URL}/productos/{medialunas.id}").json()
    assert detalle["declaracion"] is None
    assert detalle["propuesta"]["tiene_receta"] is False

    declarado = client.put(
        f"{URL}/productos/{medialunas.id}/declaracion",
        json={"empleado_id": admin.id, "contiene": ["leche"], "puede_contener": ["mani"], "confirmar": True},
    )
    assert declarado.status_code == 200
    assert declarado.json()["declaracion"]["estado"] == "confirmada"
    assert declarado.json()["leyendas"]["puede_contener"] == "PUEDE CONTENER MANÍ."

    conservado = client.put(
        f"{URL}/productos/{medialunas.id}/conservacion",
        json={"empleado_id": admin.id, "temperatura_minima": 0, "temperatura_maxima": 4, "duracion": 5},
    )
    assert conservado.status_code == 200
    assert conservado.json()["conservacion"]["duracion"] == 5
    assert len(client.get(f"{URL}/").json()) == 1


def test_operario_no_confirma(client, operario, medialunas):
    respuesta = client.put(
        f"{URL}/productos/{medialunas.id}/declaracion",
        json={"empleado_id": operario.id, "contiene": [], "confirmar": True},
    )
    assert respuesta.status_code == 403
    assert respuesta.json()["detail"] == ErrorCode.PERMISO_CONFIRMAR


def test_validaciones_de_conservacion(client, admin, medialunas):
    vacia = client.put(f"{URL}/productos/{medialunas.id}/conservacion", json={"empleado_id": admin.id})
    assert vacia.status_code == 400
    assert vacia.json()["detail"] == ErrorCode.SIN_DATOS_CONSERVACION
    cero = client.put(f"{URL}/productos/{medialunas.id}/conservacion", json={"empleado_id": admin.id, "duracion": 0})
    assert cero.status_code == 422


def test_producto_inexistente(client):
    assert client.get(f"{URL}/productos/999").status_code == 404
