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
    services.update_configuracion(db_session, ConfiguracionVistaPublicaUpdate(activa=True))

    response = client.get(f"/vista-publica/publico/{config.token}")
    assert response.status_code == 200
    data = response.json()
    assert data["activa"] is True
    assert "porcentaje_cumplimiento_limpieza" in data
    assert "porcentaje_equipos_al_dia" in data
    assert "fecha_actualizacion" in data
