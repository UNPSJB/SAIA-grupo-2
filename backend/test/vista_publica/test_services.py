from datetime import datetime
from sqlalchemy.orm import Session
from src.vista_publica import services
from src.vista_publica.schemas import ConfiguracionVistaPublicaCreate, ConfiguracionVistaPublicaUpdate

def test_get_configuracion_crea_por_defecto(db_session: Session):
    config = services.get_configuracion(db_session)
    assert config.activa is False
    assert config.token is not None
    assert config.nombre == "Vista Pública"

def test_crear_y_eliminar_configuracion(db_session: Session):
    nueva = services.crear_configuracion(db_session, ConfiguracionVistaPublicaCreate(nombre="Sucursal Norte"))
    assert nueva.id is not None
    assert nueva.nombre == "Sucursal Norte"
    assert nueva.activa is False

    configs = services.listar_configuraciones(db_session)
    ids = [c.id for c in configs]
    assert nueva.id in ids

    services.eliminar_configuracion(db_session, nueva.id)
    configs_despues = services.listar_configuraciones(db_session)
    ids_despues = [c.id for c in configs_despues]
    assert nueva.id not in ids_despues

def test_modificar_configuracion_por_id(db_session: Session):
    target = services.get_configuracion(db_session)

    updated = services.modificar_configuracion(
        db_session,
        target.id,
        ConfiguracionVistaPublicaUpdate(nombre="Planta Principal", activa=True, titulo_publico="Panadería La Espiga", presentacion="Pan y facturas todos los días.", contacto="Trelew")
    )

    assert updated.nombre == "Planta Principal"
    assert updated.activa is True
    assert isinstance(updated.fecha_activacion, datetime)
