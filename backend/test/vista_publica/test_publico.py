from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.vista_publica import services
from src.vista_publica.schemas import ConfiguracionVistaPublicaUpdate

def test_publico_desactivado_devuelve_404(client: TestClient, db_session: Session):
    config = services.get_configuracion(db_session)
    response = client.get(f"/vista-publica/publico/{config.token}")
    assert response.status_code == 404
    assert response.json()["detail"] == "La vista pública se encuentra desactivada"

def test_publico_token_invalido_devuelve_404(client: TestClient):
    response = client.get("/vista-publica/publico/token_falso_inexistente")
    assert response.status_code == 404

def test_publico_activo_devuelve_indicadores_agregados(client: TestClient, db_session: Session):
    config = services.get_configuracion(db_session)
    services.update_configuracion(db_session, ConfiguracionVistaPublicaUpdate(
        activa=True,
        mostrar_cumplimiento_limpieza=True,
        mostrar_equipos_calibrados=True
    ))

    response = client.get(f"/vista-publica/publico/{config.token}")
    assert response.status_code == 200
    data = response.json()
    assert data["activa"] is True
    assert data["mostrar_cumplimiento_limpieza"] is True
    assert data["mostrar_equipos_calibrados"] is True

def test_publico_oculta_indicador_desactivado(client: TestClient, db_session: Session):
    config = services.get_configuracion(db_session)
    services.update_configuracion(db_session, ConfiguracionVistaPublicaUpdate(
        activa=True,
        mostrar_cumplimiento_limpieza=True,
        mostrar_equipos_calibrados=False
    ))

    response = client.get(f"/vista-publica/publico/{config.token}")
    assert response.status_code == 200
    data = response.json()
    assert data["mostrar_cumplimiento_limpieza"] is True
    assert data["mostrar_equipos_calibrados"] is False
    assert data["porcentaje_equipos_al_dia"] is None
