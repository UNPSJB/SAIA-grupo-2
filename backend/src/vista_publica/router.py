import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.vista_publica import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vista-publica", tags=["vista-publica"])

@router.get("/configuracion", response_model=schemas.ConfiguracionVistaPublicaResponse)
def read_configuracion(db: Session = Depends(get_db)):
    return services.get_configuracion(db)

@router.put("/configuracion", response_model=schemas.ConfiguracionVistaPublicaResponse)
def update_configuracion(config_update: schemas.ConfiguracionVistaPublicaUpdate, db: Session = Depends(get_db)):
    return services.update_configuracion(db, config_update)

@router.get("/publico/{token}", response_model=schemas.VistaPublicaResumenResponse)
def read_vista_publica(token: str, db: Session = Depends(get_db)):
    return services.obtener_vista_publica(db, token)
