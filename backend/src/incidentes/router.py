import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends,HTTPException
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


@router.get("/resumen", response_model=schemas.ResumenIncidentes)
def read_resumen(db: Session = Depends(get_db)):
    logger.info("Consultando el resumen de incidentes desde endpoint...")
    return services.resumen_incidentes(db)


@router.get("/estadisticas", response_model=list[schemas.EstadisticaIncidente],)
def read_estadisticas_incidentes(fecha_desde: date, fecha_hasta: date, db: Session = Depends(get_db),):
    if fecha_desde > fecha_hasta:
        raise HTTPException(
            status_code=400,
            detail="La fecha desde no puede ser posterior a la fecha hasta.",
        )

    return services.obtener_estadisticas_por_tipo(db=db, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,)


@router.get("/{incidente_id}", response_model=schemas.Incidente)
def read_incidente(incidente_id: int, db: Session = Depends(get_db)):
    return services.leer_incidente(db, incidente_id)


@router.put("/{incidente_id}/cierre", response_model=schemas.Incidente)
def close_incidente(
    incidente_id: int,
    cierre: schemas.CierreIncidente,
    db: Session = Depends(get_db),
):
    logger.info("Registrando la accion correctiva de un incidente desde endpoint...")
    return services.cerrar_incidente(db, incidente_id, cierre)


@router.put("/{incidente_id}/reapertura", response_model=schemas.Incidente)
def reopen_incidente(
    incidente_id: int,
    reapertura: schemas.ReaperturaIncidente,
    db: Session = Depends(get_db),
):
    logger.info("Reabriendo un incidente desde endpoint...")
    return services.reabrir_incidente(db, incidente_id, reapertura)


@router.put("/{incidente_id}/foto", response_model=schemas.Incidente)
def attach_foto(
    incidente_id: int,
    foto: schemas.FotoIncidente,
    db: Session = Depends(get_db),
):
    logger.info("Adjuntando la foto de un incidente desde endpoint...")
    return services.adjuntar_foto(db, incidente_id, foto)
