import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.consumos import schemas, services

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/consumos", tags=["consumos"])

@router.post("/", response_model=schemas.Consumo)
def registrar_consumo(consumo: schemas.ConsumoCreate, db: Session = Depends(get_db)):
    return services.registrar_consumo(db, consumo)

@router.get("/acumulado", response_model=list[schemas.ConsumoAcumulado])
def reporte_consumo_acumulado(db: Session = Depends(get_db)):
    logger.info("Generando reporte de consumo acumulado")
    return services.obtener_consumo_acumulado(db)