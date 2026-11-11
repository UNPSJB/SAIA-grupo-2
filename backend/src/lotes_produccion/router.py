from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.lotes_produccion import schemas, services

router = APIRouter(prefix="/lotes-produccion", tags=["lotes-produccion"])


@router.get("/", response_model=List[schemas.LoteProduccion])
def read_lotes(
    producto_id: Optional[int] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    return services.listar_lotes(db, producto_id, fecha_desde, fecha_hasta)


@router.post("/", response_model=schemas.LoteProduccion)
def create_lote(lote: schemas.LoteProduccionCreate, db: Session = Depends(get_db)):
    return services.crear_lote(db, lote)


@router.get("/{nro_lote}", response_model=schemas.LoteProduccion)
def read_lote(nro_lote: int, db: Session = Depends(get_db)):
    return services.leer_lote(db, nro_lote)
