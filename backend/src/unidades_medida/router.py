import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.unidades_medida import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/unidades_medida", tags=["unidades_medida"])

@router.post("/", response_model=schemas.UnidadMedida)
def create_unidad_medida(unidad: schemas.UnidadMedidaCreate, db: Session = Depends(get_db)):
    return services.crear_unidad_medida(db, unidad)

@router.get("/", response_model=list[schemas.UnidadMedida])
def read_unidades_medida(db: Session = Depends(get_db)):
    return services.listar_unidades_medida(db)

@router.get("/{unidad_id}", response_model=schemas.UnidadMedida)
def read_unidad_medida(unidad_id: int, db: Session = Depends(get_db)):
    return services.leer_unidad_medida(db, unidad_id)

@router.put("/{unidad_id}", response_model=schemas.UnidadMedida)
def update_unidad_medida(
    unidad_id: int, unidad: schemas.UnidadMedidaUpdate, db: Session = Depends(get_db)
):
    return services.modificar_unidad_medida(db, unidad_id, unidad)

@router.delete("/{unidad_id}", response_model=schemas.UnidadMedida)
def delete_unidad_medida(unidad_id: int, db: Session = Depends(get_db)):
    return services.eliminar_unidad_medida(db, unidad_id)