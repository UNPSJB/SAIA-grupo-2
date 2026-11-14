from datetime import datetime
from sqlalchemy.orm import Session
from src.vista_publica.models import ConfiguracionVistaPublica
from src.vista_publica import services
from src.vista_publica.schemas import ConfiguracionVistaPublicaUpdate

def test_get_configuracion_crea_por_defecto(db_session: Session):
    config = services.get_configuracion(db_session)
    assert config.activa is False
    assert config.fecha_activacion is None
    assert config.token is not None
    assert len(config.token) == 32
    assert config.mostrar_cumplimiento_limpieza is False
    assert config.mostrar_equipos_calibrados is False
    assert config.mostrar_capacitaciones is False

    config_en_bd = db_session.query(ConfiguracionVistaPublica).first()
    assert config_en_bd is not None
    assert config_en_bd.id == config.id

def test_update_configuracion_a_activa(db_session: Session):
    update_data = ConfiguracionVistaPublicaUpdate(activa=True)
    config = services.update_configuracion(db_session, update_data)

    assert config.activa is True
    assert isinstance(config.fecha_activacion, datetime)
    assert config.token is not None

def test_update_configuracion_a_inactiva(db_session: Session):
    update_data_true = ConfiguracionVistaPublicaUpdate(activa=True)
    services.update_configuracion(db_session, update_data_true)

    update_data_false = ConfiguracionVistaPublicaUpdate(activa=False)
    config = services.update_configuracion(db_session, update_data_false)

    assert config.activa is False
    assert config.fecha_activacion is None
