import logging
from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.unidades_medida.models import UnidadMedida
from src.unidades_medida import schemas, exceptions

logger = logging.getLogger(__name__)

def crear_unidad_medida(db: Session, unidad: schemas.UnidadMedidaCreate) -> schemas.UnidadMedida:
    _unidad = UnidadMedida(**unidad.model_dump())
    if(unidad.nombre == ""):
        raise exceptions.NombreVacio()
    db_unidades = db.scalar(select(UnidadMedida).where(UnidadMedida.nombre==unidad.nombre))
    if(db_unidades is not None):
        raise exceptions.UnidadMedidaDuplicada()
    db.add(_unidad)
    db.commit()
    db.refresh(_unidad)
    return _unidad

def listar_unidades_medida(db: Session) -> List[schemas.UnidadMedida]:
    return db.scalars(select(UnidadMedida)).all()

def leer_unidad_medida(db: Session, unidad_id: int) -> schemas.UnidadMedida:
    db_unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.id == unidad_id))
    if db_unidad is None:
        raise exceptions.UnidadMedidaNoEncontrada()
    return db_unidad

def modificar_unidad_medida(
    db: Session, unidad_id: int, unidad: schemas.UnidadMedidaUpdate
) -> UnidadMedida:
    db_unidad = leer_unidad_medida(db, unidad_id)
    db.execute(
        update(UnidadMedida).where(UnidadMedida.id == unidad_id).values(**unidad.model_dump())
    )
    db.commit()
    db.refresh(db_unidad)
    return db_unidad

def eliminar_unidad_medida(db: Session, unidad_id: int) -> schemas.UnidadMedida:
    db_unidad = leer_unidad_medida(db, unidad_id)
    db.execute(delete(UnidadMedida).where(UnidadMedida.id == unidad_id))
    db.commit()
    return db_unidad