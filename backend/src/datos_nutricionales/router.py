from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.datos_nutricionales import schemas, services
from src.datos_nutricionales.constants import Nutriente

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


@router.get("/datos-nutricionales/valores-diarios", response_model=List[schemas.ValorDiarioReferencia])
def read_valores_diarios_referencia(db: Session = Depends(get_db)):
    return services.obtener_valores_diarios_referencia(db)


@router.put("/datos-nutricionales/valores-diarios/{nutriente}", response_model=schemas.ValorDiarioReferencia)
def update_valor_diario_referencia(
    nutriente: Nutriente, datos: schemas.ValorDiarioReferenciaUpdate, db: Session = Depends(get_db)
):
    return services.actualizar_valor_diario_referencia(db, nutriente, datos)
