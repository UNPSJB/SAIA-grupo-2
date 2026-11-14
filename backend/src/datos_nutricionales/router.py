from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.datos_nutricionales import schemas, services

router = APIRouter(tags=["datos-nutricionales"])


@router.get("/datos-nutricionales/", response_model=List[schemas.ResumenNutricionalInsumo])
def read_resumen(db: Session = Depends(get_db)):
    return services.resumen_por_insumo(db)


@router.get("/insumos/{insumo_id}/datos-nutricionales", response_model=schemas.DatosNutricionalesInsumo)
def read_datos_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.obtener_datos_insumo(db, insumo_id)


@router.put("/insumos/{insumo_id}/datos-nutricionales", response_model=schemas.DatosNutricionalesInsumo)
def update_datos_insumo(insumo_id: int, carga: schemas.CargaDatosNutricionales, db: Session = Depends(get_db)):
    return services.cargar_datos(db, insumo_id, carga)
