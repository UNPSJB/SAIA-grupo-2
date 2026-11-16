import logging
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.vista_publica import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vista-publica", tags=["vista-publica"])

@router.get("/configuraciones", response_model=List[schemas.ConfiguracionVistaPublicaResponse])
def read_configuraciones(db: Session = Depends(get_db)):
    return services.listar_configuraciones(db)

@router.post("/configuraciones", response_model=schemas.ConfiguracionVistaPublicaResponse, status_code=status.HTTP_201_CREATED)
def create_configuracion(datos: schemas.ConfiguracionVistaPublicaCreate, db: Session = Depends(get_db)):
    return services.crear_configuracion(db, datos)

@router.put("/configuraciones/{config_id}", response_model=schemas.ConfiguracionVistaPublicaResponse)
def update_configuracion_by_id(config_id: int, config_update: schemas.ConfiguracionVistaPublicaUpdate, db: Session = Depends(get_db)):
    return services.modificar_configuracion(db, config_id, config_update)

@router.delete("/configuraciones/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_configuracion(config_id: int, db: Session = Depends(get_db)):
    services.eliminar_configuracion(db, config_id)

@router.get("/configuracion", response_model=schemas.ConfiguracionVistaPublicaResponse)
def read_configuracion(db: Session = Depends(get_db)):
    return services.get_configuracion(db)

@router.put("/configuracion", response_model=schemas.ConfiguracionVistaPublicaResponse)
def update_configuracion(config_update: schemas.ConfiguracionVistaPublicaUpdate, db: Session = Depends(get_db)):
    return services.update_configuracion(db, config_update)

@router.get("/publico/{token}", response_model=schemas.VistaPublicaResumenResponse)
def read_vista_publica(token: str, db: Session = Depends(get_db)):
    return services.obtener_vista_publica(db, token)
