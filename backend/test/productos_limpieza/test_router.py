
from fastapi import status

from src.productos_limpieza.models import ProductoLimpieza
from src.productos_limpieza.constants import TipoProductoLimpieza
from src.unidades_medida.models import UnidadMedida


def crear_unidad(db_session):
    unidad = UnidadMedida(nombre="Litro router")
    db_session.add(unidad)
    db_session.commit()
    db_session.refresh(unidad)
    return unidad


def crear_producto(db_session, unidad, **cambios):
    datos = {
        "nombre": "Detergente router",
        "tipo": TipoProductoLimpieza.DETERGENTE,
        "stock": 10.0,
        "unidad_medida_id": unidad.id,
        "activo": True,
    }
    datos.update(cambios)

    producto = ProductoLimpieza(**datos)
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


def test_router_crear_producto_exito(client, db_session):
    unidad = crear_unidad(db_session)

    respuesta = client.post(
        "/productos_limpieza/",
        json={
            "nombre": "Desinfectante",
            "tipo": "desinfectante",
            "stock": 5.0,
            "unidad_medida_id": unidad.id,
        },
    )

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert datos["id"] is not None
    assert datos["nombre"] == "Desinfectante"
    assert datos["tipo"] == "desinfectante"
    assert datos["stock"] == 5.0
    assert datos["unidad_medida"]["nombre"] == unidad.nombre


def test_router_crear_producto_nombre_vacio(client, db_session):
    unidad = crear_unidad(db_session)

    respuesta = client.post(
        "/productos_limpieza/",
        json={
            "nombre": "   ",
            "tipo": "detergente",
            "stock": 5.0,
            "unidad_medida_id": unidad.id,
        },
    )

    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_router_crear_producto_stock_negativo(client, db_session):
    unidad = crear_unidad(db_session)

    respuesta = client.post(
        "/productos_limpieza/",
        json={
            "nombre": "Detergente negativo",
            "tipo": "detergente",
            "stock": -1.0,
            "unidad_medida_id": unidad.id,
        },
    )

    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_router_crear_producto_tipo_invalido(client, db_session):
    unidad = crear_unidad(db_session)

    respuesta = client.post(
        "/productos_limpieza/",
        json={
            "nombre": "Producto inválido",
            "tipo": "jabón mágico",
            "stock": 5.0,
            "unidad_medida_id": unidad.id,
        },
    )

    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_router_crear_producto_duplicado(client, db_session):
    unidad = crear_unidad(db_session)
    crear_producto(db_session, unidad, nombre="Detergente")

    respuesta = client.post(
        "/productos_limpieza/",
        json={
            "nombre": "Detergente",
            "tipo": "detergente",
            "stock": 3.0,
            "unidad_medida_id": unidad.id,
        },
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == (
        "Ya existe un producto de limpieza con ese nombre."
    )


def test_router_listar_productos(client, db_session):
    unidad = crear_unidad(db_session)
    crear_producto(db_session, unidad, nombre="Detergente")
    crear_producto(db_session, unidad, nombre="Desinfectante")

    respuesta = client.get("/productos_limpieza/")

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert len(datos) == 2
    assert {p["nombre"] for p in datos} == {"Detergente", "Desinfectante"}


def test_router_listar_productos_con_stock(client, db_session):
    unidad = crear_unidad(db_session)
    crear_producto(db_session, unidad, nombre="Con stock", stock=5.0)
    crear_producto(db_session, unidad, nombre="Sin stock", stock=0.0)

    respuesta = client.get("/productos_limpieza/?con_stock=true")

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert len(datos) == 1
    assert datos[0]["nombre"] == "Con stock"


def test_router_leer_producto_exito(client, db_session):
    unidad = crear_unidad(db_session)
    producto = crear_producto(db_session, unidad)

    respuesta = client.get(f"/productos_limpieza/{producto.id}")

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["nombre"] == producto.nombre


def test_router_leer_producto_inexistente(client):
    respuesta = client.get("/productos_limpieza/9999")

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == (
        "El producto de limpieza no fue encontrado."
    )


def test_router_modificar_producto_exito(client, db_session):
    unidad = crear_unidad(db_session)
    producto = crear_producto(db_session, unidad)

    respuesta = client.put(
        f"/productos_limpieza/{producto.id}",
        json={
            "nombre": "Detergente modificado",
            "tipo": "desengrasante",
            "stock": 20.0,
            "unidad_medida_id": unidad.id,
            "activo": True,
        },
    )

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert datos["nombre"] == "Detergente modificado"
    assert datos["tipo"] == "desengrasante"
    assert datos["stock"] == 20.0


def test_router_modificar_producto_inexistente(client, db_session):
    unidad = crear_unidad(db_session)

    respuesta = client.put(
        "/productos_limpieza/9999",
        json={
            "nombre": "Producto inexistente",
            "tipo": "detergente",
            "stock": 1.0,
            "unidad_medida_id": unidad.id,
            "activo": True,
        },
    )

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == (
        "El producto de limpieza no fue encontrado."
    )


def test_router_impacto_producto(client, db_session):
    unidad = crear_unidad(db_session)
    producto = crear_producto(db_session, unidad, stock=7.5)

    respuesta = client.get(
        f"/productos_limpieza/{producto.id}/impacto"
    )

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert datos["stock"] == 7.5
    assert datos["tareas"] == []


def test_router_eliminar_producto_activo(client, db_session):
    unidad = crear_unidad(db_session)
    producto = crear_producto(db_session, unidad, activo=True)

    respuesta = client.delete(
        f"/productos_limpieza/{producto.id}"
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert "activos no se pueden eliminar físicamente" in (
        respuesta.json()["detail"]
    )


def test_router_eliminar_producto_inactivo(client, db_session):
    unidad = crear_unidad(db_session)
    producto = crear_producto(db_session, unidad, activo=False)

    respuesta = client.delete(
        f"/productos_limpieza/{producto.id}"
    )

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json() == {
        "id": producto.id,
        "msg": "borrado",
    }

    consulta = client.get(f"/productos_limpieza/{producto.id}")
    assert consulta.status_code == status.HTTP_404_NOT_FOUND


def test_router_eliminar_producto_inexistente(client):
    respuesta = client.delete("/productos_limpieza/9999")

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == (
        "El producto de limpieza no fue encontrado."
    )
