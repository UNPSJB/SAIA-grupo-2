import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.configuracion_empresa import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/configuracion-empresa", tags=["configuracion-empresa"])

@router.get("", response_model=schemas.ConfiguracionEmpresaResponse)
def read_configuracion_empresa(db: Session = Depends(get_db)):
    return services.get_configuracion_empresa(db)

@router.put("", response_model=schemas.ConfiguracionEmpresaResponse)
def update_configuracion_empresa(
    datos: schemas.ConfiguracionEmpresaUpdate, db: Session = Depends(get_db)
):
    return services.update_configuracion_empresa(db, datos)
