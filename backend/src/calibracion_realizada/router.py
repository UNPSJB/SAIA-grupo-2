import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from sqlalchemy import select
from src.calibracion_realizada import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calibraciones_realizadas", tags=["calibraciones_realizadas"])

@router.get("/", response_model=list[schemas.CalibracionRealizada])
def listar_calibraciones_realizadas(db: Session = Depends(get_db)):
    return services.listar_calibraciones_realizadas(db)

@router.post("/", response_model=schemas.CalibracionRealizada)
def crear_calibracion_realizada(calibracion: schemas.CalibracionRealizadaCreate, db: Session = Depends(get_db)):
     return services.crear_calibracion_realizada(db, calibracion)

@router.get("/{equipo_id}", response_model=list[schemas.CalibracionRealizada])
def obtener_calibraciones_de_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.obtener_calibraciones_de_equipo(db, equipo_id)