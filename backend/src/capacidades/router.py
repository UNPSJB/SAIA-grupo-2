import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.capacidades import schemas, services

# Creamos un logger para este módulo específico. Más info.: https://docs.python.org/3/library/logging.html
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/capacidades", tags=["capacidades"])

#Rutas para capacidades

@router.post("/", response_model=schemas.Capacidad)
def create_capacidad(capacidad: schemas.CapacidadCreate, db: Session = Depends(get_db)):
    return services.crear_capacidad(db, capacidad)

@router.get("/", response_model=list[schemas.Capacidad])
def read_capacidades(db: Session = Depends(get_db)):
    logger.info("Listando capacidades desde router") # <- este mensaje se verá por la terminal
    return services.listar_capacidades(db)

@router.get("/{capacidad_id}", response_model=schemas.Capacidad)
def read_capacidad(capacidad_id: int, db: Session = Depends(get_db)):
    return services.leer_capacidad(db, capacidad_id)

@router.delete("/{capacidad_id}", response_model=schemas.Capacidad)
def delete_capacidad(capacidad_id: int, db: Session = Depends(get_db)):
    return services.eliminar_capacidad(db, capacidad_id)