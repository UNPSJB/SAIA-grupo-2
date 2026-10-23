import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.incidentes import schemas, services
from src.incidentes.constants import EstadoIncidente, TipoIncidente

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidentes", tags=["incidentes"])


@router.post("/", response_model=schemas.Incidente)
def create_incidente(
    incidente: schemas.IncidenteCreate, db: Session = Depends(get_db)
):
    logger.info("Registrando un incidente desde endpoint...")
    return services.crear_incidente(db, incidente)


@router.get("/", response_model=list[schemas.Incidente])
def read_incidentes(
    estado: Optional[EstadoIncidente] = None,
    tipo: Optional[TipoIncidente] = None,
    empleado_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    logger.info("Consultando la lista de incidentes desde endpoint...")
    return services.listar_incidentes(db, estado, tipo, empleado_id)


@router.get("/abiertos", response_model=list[schemas.Incidente])
def read_incidentes_abiertos(db: Session = Depends(get_db)):
    logger.info("Consultando los incidentes abiertos desde endpoint...")
    return services.listar_abiertos(db)


@router.get("/{incidente_id}", response_model=schemas.Incidente)
def read_incidente(incidente_id: int, db: Session = Depends(get_db)):
    return services.leer_incidente(db, incidente_id)


@router.put("/{incidente_id}/foto", response_model=schemas.Incidente)
def attach_foto(
    incidente_id: int,
    foto: schemas.FotoIncidente,
    db: Session = Depends(get_db),
):
    logger.info("Adjuntando la foto de un incidente desde endpoint...")
    return services.adjuntar_foto(db, incidente_id, foto)
