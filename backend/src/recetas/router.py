from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.recetas import schemas, services

router = APIRouter(prefix="/recetas", tags=["recetas"])

@router.post ("/producto/{producto_id}/escalar", response_model=schemas.RecetaEscalada)
def escalar_receta_producto(
    producto_id: int,
    payload: schemas.RecetaEscaladaBase,
    db: Session = Depends(get_db)
):
    return services.calcular_receta_escalada(db, producto_id, payload)