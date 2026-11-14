import logging
from typing import List

from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.insumos import exceptions, schemas
from src.insumos.constants import MAGNITUDES_INSUMO
from src.insumos.models import Insumo
from src.unidades_medida import services as unidades_services
from src.unidades_medida.models import UnidadMedida

logger = logging.getLogger(__name__)


def _validar_unidad(db: Session, unidad_medida_id: int) -> UnidadMedida:
    unidad = unidades_services.leer_unidad_medida(db, unidad_medida_id)
    if unidad.magnitud not in MAGNITUDES_INSUMO:
        raise exceptions.UnidadNoPermitida()
    return unidad


def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> Insumo:
    if insumo.nombre == "":
        raise exceptions.NombreVacio()

    db_insumos = db.scalar(select(Insumo).where(Insumo.nombre == insumo.nombre))
    if db_insumos is not None:
        raise exceptions.NombreDuplicado()

    _validar_unidad(db, insumo.unidad_medida_id)

    _insumo = Insumo(**insumo.model_dump())
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo


def listar_insumos(db: Session) -> List[Insumo]:
    logger.info("Listando insumos desde services")
    return db.scalars(select(Insumo)).all()


def leer_insumo(db: Session, insumo_id: int) -> Insumo:
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id))
    if db_insumo is None:
        raise exceptions.InsumoNoEncontrado()
    return db_insumo


def modificar_insumo(db: Session, insumo_id: int, insumo: schemas.InsumoUpdate) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)

    if insumo.nombre == "":
        raise exceptions.NombreVacio()

    if insumo.nombre:
        existe = db.scalar(select(Insumo).where(Insumo.nombre == insumo.nombre, Insumo.id != insumo_id))
        if existe is not None:
            raise exceptions.NombreDuplicado()

    nueva_unidad = _validar_unidad(db, insumo.unidad_medida_id)
    if nueva_unidad.magnitud != db_insumo.unidad_medida.magnitud and db_insumo.cantidad:
        raise exceptions.CambioDeMagnitudConStock()

    try:
        db.execute(update(Insumo).where(Insumo.id == insumo_id).values(**insumo.model_dump()))
        db.commit()
        db.refresh(db_insumo)
        return db_insumo
    except IntegrityError:
        db.rollback()
        raise exceptions.NombreDuplicado()


def eliminar_insumo(db: Session, insumo_id: int) -> schemas.InsumoDelete:
    db_insumo = leer_insumo(db, insumo_id)
    if db_insumo.activo:
        raise HTTPException(
            status_code=400,
            detail="Los insumos activos no se pueden eliminar físicamente. Primero debe darlo de baja lógica."
        )
    db.execute(delete(Insumo).where(Insumo.id == insumo_id))
    db.commit()
    return {"id": insumo_id, "msg": "borrado"}


def cantidad_en_base(db: Session, insumo: Insumo, cantidad: float, unidad_medida_id: int) -> float:
    """Convierte una cantidad expresada en cualquier unidad de la misma magnitud del insumo a gramos o mililitros."""
    if cantidad <= 0:
        raise exceptions.CantidadInvalida()
    unidad = unidades_services.leer_unidad_medida(db, unidad_medida_id)
    if unidad.magnitud != insumo.unidad_medida.magnitud:
        raise exceptions.UnidadIncompatible()
    return unidades_services.convertir_a_base(cantidad, unidad)


def sumar_stock(db: Session, insumo_id: int, datos: schemas.InsumoAgregarStock) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    db_insumo.cantidad = round((db_insumo.cantidad or 0.0) + cantidad_en_base(
        db, db_insumo, datos.cantidad, datos.unidad_medida_id
    ), 2)
    db.commit()
    db.refresh(db_insumo)
    return db_insumo
