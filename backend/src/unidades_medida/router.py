from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.unidades_medida import schemas, services

router = APIRouter(prefix="/unidades_medida", tags=["unidades_medida"])


@router.get("/", response_model=list[schemas.UnidadMedida])
def read_unidades_medida(db: Session = Depends(get_db)):
    return services.listar_unidades_medida(db)


@router.get("/{unidad_id}", response_model=schemas.UnidadMedida)
def read_unidad_medida(unidad_id: int, db: Session = Depends(get_db)):
    return services.leer_unidad_medida(db, unidad_id)
