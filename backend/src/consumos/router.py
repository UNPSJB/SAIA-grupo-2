import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.consumos import schemas, services
from datetime import date
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/consumos", tags=["consumos"])

@router.post("/", response_model=schemas.Consumo)
def registrar_consumo(consumo: schemas.ConsumoCreate, db: Session = Depends(get_db)):
    return services.registrar_consumo(db, consumo)

@router.get("/reporte", response_model=list[schemas.ConsumoAcumulado] | list[schemas.ConsumoDetallado])
def reporte_consumos(
    db: Session = Depends(get_db),
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    acumulado: bool = True
):
    logger.info(f"Generando reporte de consumos (Acumulado: {acumulado})")
    return services.obtener_reporte_consumos(db, fecha_inicio, fecha_fin, acumulado)