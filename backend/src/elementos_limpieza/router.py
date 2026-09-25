import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.elementos_limpieza import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/elementos_limpieza", tags=["elementos_limpieza"])


@router.post("/", response_model=schemas.ElementoLimpieza)
def create_elemento(
    elemento: schemas.ElementoLimpiezaCreate, db: Session = Depends(get_db)
):
    return services.crear_elemento(db, elemento)


@router.get("/", response_model=list[schemas.ElementoLimpieza])
def read_elementos(db: Session = Depends(get_db)):
    logger.info("Consultando la lista de elementos de limpieza desde endpoint...")
    return services.listar_elementos(db)


@router.get("/{elemento_id}", response_model=schemas.ElementoLimpieza)
def read_elemento(elemento_id: int, db: Session = Depends(get_db)):
    return services.leer_elemento(db, elemento_id)


@router.put("/{elemento_id}", response_model=schemas.ElementoLimpieza)
def update_elemento(
    elemento_id: int,
    elemento: schemas.ElementoLimpiezaUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_elemento(db, elemento_id, elemento)


@router.delete("/{elemento_id}", response_model=schemas.ElementoLimpiezaDelete)
def delete_elemento(elemento_id: int, db: Session = Depends(get_db)):
    return services.eliminar_elemento(db, elemento_id)
