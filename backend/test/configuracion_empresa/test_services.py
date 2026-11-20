from sqlalchemy.orm import Session
from src.configuracion_empresa import services
from src.configuracion_empresa.schemas import ConfiguracionEmpresaUpdate

def test_get_configuracion_empresa_crea_default(db_session: Session):
    config = services.get_configuracion_empresa(db_session)
    assert config.id is not None
    assert config.nombre_empresa is not None
    assert config.cuit is not None

def test_update_configuracion_empresa(db_session: Session):
    update_data = ConfiguracionEmpresaUpdate(
        nombre_empresa="Nueva PYME S.A.",
        cuit="30-99999999-9"
    )
    config = services.update_configuracion_empresa(db_session, update_data)
    assert config.nombre_empresa == "Nueva PYME S.A."
    assert config.cuit == "30-99999999-9"
