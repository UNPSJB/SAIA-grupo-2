from datetime import date
from typing import List, Optional

from sqlalchemy import select, insert, delete
from sqlalchemy.orm import Session

from src.lotes_produccion import exceptions, schemas
from src.lotes_produccion.models import LoteProduccion
from src.productos import services as productos_services

from src.insumos.models import Insumo
from src.asociaciones.lote_insumos import lote_insumo


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





def asociar_insumo(db: Session, nro_lote: int, datos: schemas.AsociarInsumoLote):

    leer_lote(db, nro_lote)
  
    if datos.cantidad_utilizada <= 0:
        raise exceptions.CantidadInvalida()

    db_insumo = db.get(Insumo, datos.insumo_id)
    if db_insumo is None:
        raise exceptions.InsumoNoEncontrado()
    if not db_insumo.activo:
        raise exceptions.InsumoInactivo()

    ya_existe = db.scalar(
        select(lote_insumo).where(
            lote_insumo.c.lote_id == nro_lote,
            lote_insumo.c.insumo_id == datos.insumo_id
        )
    )
    if ya_existe is not None:
        raise exceptions.InsumoYaAsociado()

    stock_actual = db_insumo.cantidad or 0.0
    if stock_actual < datos.cantidad_utilizada:
        raise exceptions.StockInsuficiente()

    db_insumo.cantidad = stock_actual - datos.cantidad_utilizada

    db.execute(
        insert(lote_insumo).values(
            lote_id=nro_lote,
            insumo_id=datos.insumo_id,
            cantidad_utilizada=datos.cantidad_utilizada,
            unidad_medida_id=db_insumo.unidad_medida_id
        )
    )
    db.commit()
    return {"msg": "Insumo asociado correctamente al lote"}


def listar_insumos_lote(db: Session, nro_lote: int) -> List[schemas.InsumoAsociadoDetalle]:
    leer_lote(db, nro_lote)

    consulta = (
        select(
            lote_insumo.c.insumo_id,
            Insumo.nombre,
            lote_insumo.c.cantidad_utilizada
        )
        .join(Insumo, lote_insumo.c.insumo_id == Insumo.id)
        .where(lote_insumo.c.lote_id == nro_lote)
    )
    filas = db.execute(consulta).all()
    return [
        schemas.InsumoAsociadoDetalle(
            insumo_id=f.insumo_id,
            nombre=f.nombre,
            cantidad_utilizada=f.cantidad_utilizada,
            unidad_medida="Gramos"
        )
        for f in filas
    ]


def quitar_insumo(db: Session, nro_lote: int, insumo_id: int):
    leer_lote(db, nro_lote)

    fila = db.execute(
        select(lote_insumo.c.cantidad_utilizada).where(
            lote_insumo.c.lote_id == nro_lote,
            lote_insumo.c.insumo_id == insumo_id
        )
    ).first()
    if fila is None:
        raise exceptions.InsumoNoEncontrado()

    db_insumo = db.get(Insumo, insumo_id)
    if db_insumo:
        db_insumo.cantidad = (db_insumo.cantidad or 0.0) + fila.cantidad_utilizada

    db.execute(
        delete(lote_insumo).where(
            lote_insumo.c.lote_id == nro_lote,
            lote_insumo.c.insumo_id == insumo_id
        )
    )
    db.commit()
    return {"msg": "Insumo quitado del lote"}