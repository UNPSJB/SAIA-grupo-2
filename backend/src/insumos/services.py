import logging
from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions

# Creamos un logger para este módulo específico[cite: 6].
logger = logging.getLogger(__name__)

def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> schemas.Insumo:
    _insumo = Insumo(**insumo.model_dump())
    if(insumo.nombre == ""):
        raise exceptions.NombreVacio()
    
    db_insumos = db.scalar(select(Insumo).where(Insumo.nombre == insumo.nombre))
    if db_insumos is not None:
        raise exceptions.NombreDuplicado()
        
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo

def listar_insumos(db: Session) -> List[schemas.Insumo]:
    logger.info("Listando insumos desde services")
    return db.scalars(select(Insumo)).all()

def leer_insumo(db: Session, insumo_id: int) -> schemas.Insumo:
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id))
    if db_insumo is None:
        raise exceptions.InsumoNoEncontrado()
    return db_insumo

def modificar_insumo(
    db: Session, insumo_id: int, insumo: schemas.InsumoUpdate
) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    db.execute(
        update(Insumo).where(Insumo.id == insumo_id).values(**insumo.model_dump())
    )
    db.commit()
    db.refresh(db_insumo)
    return db_insumo

def eliminar_insumo(db: Session, insumo_id: int) -> schemas.InsumoDelete:
    db_insumo = leer_insumo(db, insumo_id)
    #import pdb; pdb.set_trace()
    db.execute(delete(Insumo).where(Insumo.id == insumo_id))
    db.commit()
    return {"id": insumo_id, "msg": "borrado"}