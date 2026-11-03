
from datetime import date, timedelta

from fastapi import status

from src.equipos.models import Equipo, TipoEquipo
from src.equipos.constants import EstadoEquipo
from src.sectores.models import Sector


def crear_datos_base(db_session):
    sector = Sector(nombre="Cocina router equipos")
    tipo = TipoEquipo(nombre="heladera")

    db_session.add_all([sector, tipo])
    db_session.commit()
    db_session.refresh(sector)
    db_session.refresh(tipo)

    return sector, tipo


def crear_equipo(db_session, sector, tipo, **cambios):
    datos = {
        "nombre": "Heladera router",
        "activo": True,
        "sector_id": sector.id,
        "tipo_id": tipo.id,
        "estado": EstadoEquipo.BUENO,
        "frecuencia_mantenimiento_dias": 30,
        "fecha_ultimo_mantenimiento": date.today(),
    }
    datos.update(cambios)

    equipo = Equipo(**datos)
    db_session.add(equipo)
    db_session.commit()
    db_session.refresh(equipo)
    return equipo


def test_router_listar_tipos_equipo(client, db_session):
    _, tipo = crear_datos_base(db_session)

    respuesta = client.get("/equipos/tipos")

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert len(datos) == 1
    assert datos[0]["id"] == tipo.id
    assert datos[0]["nombre"] == "heladera"


def test_router_crear_equipo_exito(client, db_session):
    sector, tipo = crear_datos_base(db_session)

    respuesta = client.post(
        "/equipos/",
        json={
            "nombre": "Heladera nueva",
            "activo": True,
            "sector_id": sector.id,
            "tipo_id": tipo.id,
            "estado": "bueno",
            "frecuencia_mantenimiento_dias": 30,
        },
    )

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert datos["id"] is not None
    assert datos["nombre"] == "Heladera nueva"
    assert datos["sector"]["id"] == sector.id
    assert datos["tipo"]["id"] == tipo.id
    assert datos["fecha_proximo_mantenimiento"] == (
        date.today() + timedelta(days=30)
    ).isoformat()


def test_router_listar_equipos(client, db_session):
    sector, tipo = crear_datos_base(db_session)
    crear_equipo(db_session, sector, tipo, nombre="Heladera")
    crear_equipo(db_session, sector, tipo, nombre="Horno")

    respuesta = client.get("/equipos/")

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert len(datos) == 2
    assert {equipo["nombre"] for equipo in datos} == {"Heladera", "Horno"}


def test_router_leer_equipo_exito(client, db_session):
    sector, tipo = crear_datos_base(db_session)
    equipo = crear_equipo(db_session, sector, tipo)

    respuesta = client.get(f"/equipos/{equipo.id}")

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert datos["id"] == equipo.id
    assert datos["nombre"] == equipo.nombre
    assert datos["sector"]["nombre"] == sector.nombre
    assert datos["tipo"]["nombre"] == tipo.nombre


def test_router_leer_equipo_inexistente(client):
    respuesta = client.get("/equipos/9999")

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == "El equipo no fue encontrado"


def test_router_modificar_equipo_exito(client, db_session):
    sector, tipo = crear_datos_base(db_session)
    equipo = crear_equipo(db_session, sector, tipo)

    respuesta = client.put(
        f"/equipos/{equipo.id}",
        json={
            "nombre": "Heladera modificada",
            "activo": True,
            "sector_id": sector.id,
            "tipo_id": tipo.id,
            "estado": "danado",
            "frecuencia_mantenimiento_dias": 60,
        },
    )

    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert datos["nombre"] == "Heladera modificada"
    assert datos["estado"] == "danado"
    assert datos["frecuencia_mantenimiento_dias"] == 60


def test_router_modificar_equipo_inexistente(client, db_session):
    sector, tipo = crear_datos_base(db_session)

    respuesta = client.put(
        "/equipos/9999",
        json={
            "nombre": "Equipo inexistente",
            "activo": True,
            "sector_id": sector.id,
            "tipo_id": tipo.id,
            "estado": "bueno",
            "frecuencia_mantenimiento_dias": 30,
        },
    )

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == "El equipo no fue encontrado"


def test_router_crear_equipo_tipo_inexistente(client, db_session):
    sector = Sector(nombre="Cocina sin tipo")
    db_session.add(sector)
    db_session.commit()
    db_session.refresh(sector)

    respuesta = client.post(
        "/equipos/",
        json={
            "nombre": "Equipo sin tipo",
            "sector_id": sector.id,
            "tipo_id": 9999,
            "frecuencia_mantenimiento_dias": 30,
        },
    )

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == "El tipo de equipo no existe en el sistema"


def test_router_crear_equipo_fecha_vencida(client, db_session):
    sector, tipo = crear_datos_base(db_session)

    respuesta = client.post(
        "/equipos/",
        json={
            "nombre": "Equipo con fecha vencida",
            "sector_id": sector.id,
            "tipo_id": tipo.id,
            "frecuencia_mantenimiento_dias": 30,
            "fecha_proximo_mantenimiento": (
                date.today() - timedelta(days=1)
            ).isoformat(),
        },
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == (
        "La fecha de vencimiento no puede ser anterior a hoy"
    )


def test_router_eliminar_equipo_activo(client, db_session):
    sector, tipo = crear_datos_base(db_session)
    equipo = crear_equipo(db_session, sector, tipo, activo=True)

    respuesta = client.delete(f"/equipos/{equipo.id}")

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert "activos no se pueden eliminar físicamente" in respuesta.json()["detail"]


def test_router_eliminar_equipo_inactivo(client, db_session):
    sector, tipo = crear_datos_base(db_session)
    equipo = crear_equipo(db_session, sector, tipo, activo=False)

    respuesta = client.delete(f"/equipos/{equipo.id}")

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["id"] == equipo.id

    consulta = client.get(f"/equipos/{equipo.id}")
    assert consulta.status_code == status.HTTP_404_NOT_FOUND


def test_router_eliminar_equipo_inexistente(client):
    respuesta = client.delete("/equipos/9999")

    assert respuesta.status_code == status.HTTP_404_NOT_FOUND
    assert respuesta.json()["detail"] == "El equipo no fue encontrado"
