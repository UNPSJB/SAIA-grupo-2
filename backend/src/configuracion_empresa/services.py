from sqlalchemy import select
from sqlalchemy.orm import Session
from src.configuracion_empresa.models import ConfiguracionEmpresa
from src.configuracion_empresa import schemas
from src.configuracion_empresa.default_logo import DEFAULT_LOGO_BASE64

def get_configuracion_empresa(db: Session) -> ConfiguracionEmpresa:
    config = db.scalar(select(ConfiguracionEmpresa))
    if not config:
        config = ConfiguracionEmpresa(
            nombre_empresa="SAIA - Alimentos & Bebidas",
            cuit="30-71122334-9",
            domicilio="Ruta 3 Km 1400, Trelew, Chubut",
            telefono="0280 442-1234",
            email="calidad@saia.com",
            logo_base64=DEFAULT_LOGO_BASE64
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    elif not config.logo_base64:
        config.logo_base64 = DEFAULT_LOGO_BASE64
        db.commit()
        db.refresh(config)
    return config

def update_configuracion_empresa(
    db: Session, datos: schemas.ConfiguracionEmpresaUpdate
) -> ConfiguracionEmpresa:
    config = get_configuracion_empresa(db)

    if datos.nombre_empresa is not None:
        config.nombre_empresa = datos.nombre_empresa.strip() or config.nombre_empresa
    if datos.cuit is not None:
        config.cuit = datos.cuit.strip() or config.cuit
    if datos.domicilio is not None:
        config.domicilio = datos.domicilio.strip() or config.domicilio
    if datos.telefono is not None:
        config.telefono = datos.telefono.strip() or config.telefono
    if datos.email is not None:
        config.email = datos.email.strip() or config.email
    if datos.logo_base64 is not None:
        config.logo_base64 = datos.logo_base64

    db.commit()
    db.refresh(config)
    return config
