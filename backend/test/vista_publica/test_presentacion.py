import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.vista_publica import exceptions, services
from src.vista_publica.constants import LARGO_PRESENTACION, PRESENTACION_INCOMPLETA
from src.vista_publica.schemas import ConfiguracionVistaPublicaUpdate

PRESENTACION = "Panadería artesanal desde 1987. Masa madre y productos frescos todos los días."


def test_configuracion_nueva_sin_presentacion(db_session: Session):
    config = services.get_configuracion(db_session)

    assert (config.titulo_publico, config.presentacion, config.contacto) == (None, None, None)


def test_guardar_presentacion_recorta_espacios(db_session: Session):
    config = services.get_configuracion(db_session)

    actualizada = services.modificar_configuracion(
        db_session,
        config.id,
        ConfiguracionVistaPublicaUpdate(
            titulo_publico="  Panadería La Espiga ", presentacion=PRESENTACION, contacto=" Av. Fontana 123, Trelew "
        ),
    )

    assert actualizada.titulo_publico == "Panadería La Espiga"
    assert actualizada.presentacion == PRESENTACION
    assert actualizada.contacto == "Av. Fontana 123, Trelew"


def test_texto_vacio_borra_y_campo_omitido_no_cambia(db_session: Session):
    config = services.get_configuracion(db_session)
    services.modificar_configuracion(
        db_session, config.id, ConfiguracionVistaPublicaUpdate(titulo_publico="La Espiga", contacto="Trelew")
    )

    actualizada = services.modificar_configuracion(
        db_session, config.id, ConfiguracionVistaPublicaUpdate(titulo_publico="   ")
    )

    assert actualizada.titulo_publico is None
    assert actualizada.contacto == "Trelew"


def test_vista_publica_incluye_la_presentacion(client: TestClient, db_session: Session):
    config = services.get_configuracion(db_session)
    services.update_configuracion(db_session, ConfiguracionVistaPublicaUpdate(activa=True, **COMPLETA))

    datos = client.get(f"/vista-publica/publico/{config.token}").json()

    assert (datos["titulo_publico"], datos["presentacion"], datos["contacto"]) == ("La Espiga", PRESENTACION, "Trelew")


def test_router_rechaza_presentacion_demasiado_larga(client: TestClient, db_session: Session):
    config = services.get_configuracion(db_session)

    respuesta = client.put(
        f"/vista-publica/configuraciones/{config.id}", json={"presentacion": "a" * (LARGO_PRESENTACION + 1)}
    )

    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_router_guarda_presentacion(client: TestClient, db_session: Session):
    config = services.get_configuracion(db_session)

    respuesta = client.put(f"/vista-publica/configuraciones/{config.id}", json={"titulo_publico": "La Espiga"})

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["titulo_publico"] == "La Espiga"
    assert respuesta.json()["presentacion"] is None


COMPLETA = {"titulo_publico": "La Espiga", "presentacion": PRESENTACION, "contacto": "Trelew"}


def test_no_se_activa_sin_presentacion_completa(db_session: Session):
    config = services.get_configuracion(db_session)

    for faltante in COMPLETA:
        datos = {campo: valor for campo, valor in COMPLETA.items() if campo != faltante}
        with pytest.raises(exceptions.PresentacionIncompletaException):
            services.modificar_configuracion(db_session, config.id, ConfiguracionVistaPublicaUpdate(activa=True, **datos))

    db_session.refresh(config)
    assert config.activa is False


def test_activa_no_permite_vaciar_la_presentacion(db_session: Session):
    config = services.get_configuracion(db_session)
    services.modificar_configuracion(db_session, config.id, ConfiguracionVistaPublicaUpdate(activa=True, **COMPLETA))

    with pytest.raises(exceptions.PresentacionIncompletaException):
        services.modificar_configuracion(db_session, config.id, ConfiguracionVistaPublicaUpdate(contacto="  "))

    db_session.refresh(config)
    assert config.contacto == "Trelew"


def test_se_puede_activar_en_dos_pasos_y_desactivar_sin_presentacion(db_session: Session):
    config = services.get_configuracion(db_session)
    services.modificar_configuracion(db_session, config.id, ConfiguracionVistaPublicaUpdate(**COMPLETA))

    activa = services.modificar_configuracion(db_session, config.id, ConfiguracionVistaPublicaUpdate(activa=True))
    assert activa.activa is True

    pausada = services.modificar_configuracion(
        db_session, config.id, ConfiguracionVistaPublicaUpdate(activa=False, presentacion="")
    )
    assert (pausada.activa, pausada.presentacion) == (False, None)


def test_vista_publica_sin_indicadores_muestra_la_presentacion(client: TestClient, db_session: Session):
    config = services.get_configuracion(db_session)
    services.update_configuracion(
        db_session,
        ConfiguracionVistaPublicaUpdate(
            activa=True, mostrar_cumplimiento_limpieza=False, mostrar_equipos_calibrados=False, **COMPLETA
        ),
    )

    datos = client.get(f"/vista-publica/publico/{config.token}").json()

    assert datos["titulo_publico"] == "La Espiga"
    assert not any(valor for clave, valor in datos.items() if clave.startswith("mostrar_"))


def test_router_activar_sin_presentacion(client: TestClient, db_session: Session):
    config = services.get_configuracion(db_session)

    respuesta = client.put(f"/vista-publica/configuraciones/{config.id}", json={"activa": True})

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == PRESENTACION_INCOMPLETA
