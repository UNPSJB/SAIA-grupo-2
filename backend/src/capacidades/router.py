import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.capacidades import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/capacidades", tags=["capacidades"])


@router.post("/", response_model=schemas.Capacidad)
def create_capacidad(capacidad: schemas.CapacidadCreate, db: Session = Depends(get_db)):
    return services.crear_capacidad(db, capacidad)

@router.get("/", response_model=list[schemas.Capacidad])
def read_capacidades(db: Session = Depends(get_db)):
    return services.listar_capacidades(db)

@router.get("/{capacidad_id}", response_model=schemas.Capacidad)
def read_capacidad(capacidad_id: int, db: Session = Depends(get_db)):
    return services.leer_capacidad(db, capacidad_id)

@router.put("/{capacidad_id}", response_model=schemas.Capacidad)
def update_capacidad(
    capacidad_id: int, 
    capacidad: schemas.CapacidadUpdate, 
    db: Session = Depends(get_db)
):
    return services.modificar_capacidad(db, capacidad_id, capacidad)

@router.delete("/{capacidad_id}", response_model=schemas.Capacidad)
def delete_capacidad(capacidad_id: int, db: Session = Depends(get_db)):
    return services.eliminar_capacidad(db, capacidad_id)