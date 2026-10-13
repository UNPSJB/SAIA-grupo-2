import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.documentacion import schemas, services
from src.documentacion.constants import TipoDocumentacion

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documentacion", tags=["documentacion"])


# @router.get("/alertas", response_model=list[schemas.AlertaVencimiento])
# def read_alertas(
#     tipo: Optional[TipoDocumentacion] = None, db: Session = Depends(get_db)
# ):
#     logger.info("Consultando alertas de vencimiento desde endpoint...")
#     return services.obtener_alertas(db, tipo)

# @router.get("/alertas", response_model=list[schemas.AlertaVencimiento])
# def read_alertas(
#     tipo: Optional[TipoDocumentacion] = None,
#     empleado_id: Optional[int] = None,
#     db: Session = Depends(get_db),
# ):
#     logger.info("Consultando alertas de vencimiento desde endpoint...")
#     return services.obtener_alertas(db, tipo, empleado_id)

@router.get("/alertas", response_model=list[schemas.AlertaVencimiento])
def read_alertas(
    tipo: Optional[TipoDocumentacion] = None,
    empleado_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    db: Session = Depends(get_db),
):
    logger.info("Consultando alertas de vencimiento desde endpoint...")
    return services.obtener_alertas(
        db,
        tipo,
        empleado_id,
        fecha_desde,
        fecha_hasta,
    )

@router.get("/requisitos", response_model=list[schemas.RequisitoDocumentacion])
def read_requisitos(db: Session = Depends(get_db)):
    logger.info("Consultando los requisitos de documentacion desde endpoint...")
    return services.listar_requisitos(db)


@router.put("/requisitos/{tipo}", response_model=schemas.RequisitoDocumentacion)
def update_requisito(
    tipo: TipoDocumentacion,
    requisito: schemas.RequisitoUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_requisito(db, tipo, requisito)


@router.get("/cumplimiento", response_model=list[schemas.CumplimientoEmpleado])
def read_cumplimiento(solo_incompletos: bool = False, db: Session = Depends(get_db)):
    logger.info("Consultando el cumplimiento documental del personal desde endpoint...")
    return services.listar_cumplimiento(db, solo_incompletos)


@router.get("/cumplimiento/{empleado_id}", response_model=schemas.CumplimientoEmpleado)
def read_cumplimiento_empleado(empleado_id: int, db: Session = Depends(get_db)):
    return services.obtener_cumplimiento(db, empleado_id)


@router.post("/", response_model=schemas.Documentacion)
def create_documentacion(
    documento: schemas.DocumentacionCreate, db: Session = Depends(get_db)
):
    return services.crear_documentacion(db, documento)


@router.get("/", response_model=list[schemas.Documentacion])
def read_documentacion_lista(
    empleado_id: Optional[int] = None,
    tipo: Optional[TipoDocumentacion] = None,
    db: Session = Depends(get_db),
):
    logger.info("Consultando la lista de documentacion desde endpoint...")
    return services.listar_documentacion(db, empleado_id, tipo)


@router.get("/{documentacion_id}", response_model=schemas.Documentacion)
def read_documentacion(documentacion_id: int, db: Session = Depends(get_db)):
    return services.leer_documentacion(db, documentacion_id)


@router.put("/{documentacion_id}", response_model=schemas.Documentacion)
def update_documentacion(
    documentacion_id: int,
    documento: schemas.DocumentacionUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_documentacion(db, documentacion_id, documento)


@router.delete("/{documentacion_id}", response_model=schemas.DocumentacionDelete)
def delete_documentacion(documentacion_id: int, db: Session = Depends(get_db)):
    return services.eliminar_documentacion(db, documentacion_id)
