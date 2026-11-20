from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.parametros_normativos import schemas, services

router = APIRouter(prefix="/parametros-normativos", tags=["parametros-normativos"])


@router.get("/", response_model=List[schemas.ConjuntoResumen])
def read_conjuntos(db: Session = Depends(get_db)):
    return services.listar_conjuntos(db)


@router.get("/vigente", response_model=schemas.ConjuntoDetalle)
def read_vigente(db: Session = Depends(get_db)):
    return services.detalle(db, services.conjunto_vigente(db))


@router.get("/modulo-rotulado-frontal", response_model=schemas.ModuloRotuladoFrontal)
def read_modulo(db: Session = Depends(get_db)):
    return services.leer_modulo(db)


@router.put("/modulo-rotulado-frontal", response_model=schemas.ModuloRotuladoFrontal)
def update_modulo(datos: schemas.CambioModulo, db: Session = Depends(get_db)):
    return services.cambiar_modulo(db, datos)


@router.post("/borradores", response_model=schemas.ConjuntoDetalle)
def create_borrador(datos: schemas.NuevoBorrador, db: Session = Depends(get_db)):
    return services.detalle(db, services.crear_borrador(db, datos))


@router.get("/{conjunto_id}", response_model=schemas.ConjuntoDetalle)
def read_conjunto(conjunto_id: int, db: Session = Depends(get_db)):
    return services.detalle(db, services.leer_conjunto(db, conjunto_id))


@router.put("/{conjunto_id}", response_model=schemas.ConjuntoDetalle)
def update_borrador(conjunto_id: int, datos: schemas.BorradorUpdate, db: Session = Depends(get_db)):
    return services.detalle(db, services.modificar_borrador(db, conjunto_id, datos))


@router.post("/{conjunto_id}/publicar", response_model=schemas.ConjuntoDetalle)
def publish_conjunto(conjunto_id: int, datos: schemas.Publicacion, db: Session = Depends(get_db)):
    return services.detalle(db, services.publicar(db, conjunto_id, datos))


@router.delete("/{conjunto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_borrador(conjunto_id: int, db: Session = Depends(get_db)):
    services.descartar_borrador(db, conjunto_id)
