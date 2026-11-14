from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.unidades_medida import exceptions
from src.unidades_medida.constants import CATALOGO_UNIDADES, DECIMALES_CANTIDAD, MagnitudUnidad
from src.unidades_medida.models import UnidadMedida


def listar_unidades_medida(db: Session) -> List[UnidadMedida]:
    return db.scalars(select(UnidadMedida).order_by(UnidadMedida.id)).all()


def leer_unidad_medida(db: Session, unidad_id: int) -> UnidadMedida:
    db_unidad = db.get(UnidadMedida, unidad_id)
    if db_unidad is None:
        raise exceptions.UnidadMedidaNoEncontrada()
    return db_unidad


def unidad_base(db: Session, magnitud: MagnitudUnidad) -> UnidadMedida:
    """Devuelve la unidad en la que se guardan las cantidades de esa magnitud (factor 1)."""
    db_unidad = db.scalar(
        select(UnidadMedida).where(UnidadMedida.magnitud == magnitud, UnidadMedida.factor_base == 1.0)
    )
    if db_unidad is None:
        raise exceptions.UnidadMedidaNoEncontrada()
    return db_unidad


def convertir_a_base(cantidad: float, unidad: UnidadMedida) -> float:
    return round(cantidad * unidad.factor_base, DECIMALES_CANTIDAD)


def crear_catalogo(db: Session) -> int:
    """Carga las unidades del catalogo que todavia no existan. Devuelve cuantas agrego."""
    existentes = set(db.scalars(select(UnidadMedida.nombre)).all())
    nuevas = [
        UnidadMedida(nombre=nombre, magnitud=magnitud, factor_base=factor)
        for nombre, magnitud, factor in CATALOGO_UNIDADES
        if nombre not in existentes
    ]
    db.add_all(nuevas)
    db.commit()
    return len(nuevas)
