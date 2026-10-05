import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.vencimientos import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vencimientos", tags=["vencimientos"])


@router.get(
    "/",
    response_model=schemas.ResumenVencimientos,
    summary="Consultar listado consolidado de vencimientos",
)
def read_vencimientos_consolidados(
    categoria: Optional[schemas.CategoriaVencimiento] = None,
    estado: Optional[schemas.EstadoVencimiento] = None,
    db: Session = Depends(get_db),
):
    logger.info("Consulta al endpoint de vencimientos consolidados")
    return services.obtener_vencimientos_consolidados(db, categoria, estado)
