from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.alimentos_referencia import schemas, services
from src.alimentos_referencia.constants import LIMITE_BUSQUEDA, LIMITE_BUSQUEDA_MAXIMO
from src.database import get_db

router = APIRouter(prefix="/alimentos-referencia", tags=["alimentos-referencia"])


@router.get("/", response_model=List[schemas.AlimentoReferencia])
def read_alimentos(
    busqueda: str = Query(""),
    limite: int = Query(LIMITE_BUSQUEDA, ge=1, le=LIMITE_BUSQUEDA_MAXIMO),
    db: Session = Depends(get_db),
):
    return services.buscar_alimentos(db, busqueda, limite)


@router.get("/{codigo}", response_model=schemas.AlimentoReferencia)
def read_alimento(codigo: str, db: Session = Depends(get_db)):
    return services.leer_alimento(db, codigo)
