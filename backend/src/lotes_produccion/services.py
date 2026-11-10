from datetime import date
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.lotes_produccion import exceptions, schemas
from src.lotes_produccion.models import LoteProduccion
from src.productos import services as productos_services


def crear_lote(db: Session, lote: schemas.LoteProduccionCreate) -> LoteProduccion:
    productos_services.leer_producto(db, lote.producto_id)

    if lote.fecha > date.today():
        raise exceptions.FechaFutura()
    if lote.cantidad <= 0:
        raise exceptions.CantidadInvalida()

    db_lote = LoteProduccion(**lote.model_dump())
    db.add(db_lote)
    db.commit()
    db.refresh(db_lote)
    return db_lote


def leer_lote(db: Session, nro_lote: int) -> LoteProduccion:
    db_lote = db.get(LoteProduccion, nro_lote)
    if db_lote is None:
        raise exceptions.LoteNoEncontrado()
    return db_lote


def listar_lotes(
    db: Session,
    producto_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
) -> List[LoteProduccion]:
    """Historial de lotes, del mas reciente al mas antiguo, con filtros opcionales."""
    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise exceptions.RangoFechasInvalido()

    consulta = select(LoteProduccion)
    if producto_id is not None:
        consulta = consulta.where(LoteProduccion.producto_id == producto_id)
    if fecha_desde is not None:
        consulta = consulta.where(LoteProduccion.fecha >= fecha_desde)
    if fecha_hasta is not None:
        consulta = consulta.where(LoteProduccion.fecha <= fecha_hasta)

    return list(
        db.scalars(
            consulta.order_by(LoteProduccion.fecha.desc(), LoteProduccion.nro_lote.desc())
        ).all()
    )
