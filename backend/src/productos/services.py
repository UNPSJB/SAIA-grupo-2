from typing import List, Optional
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from src.unidades_medida.models import UnidadMedida
from src.lotes_produccion.models import LoteProduccion
from src.productos import exceptions, schemas
from src.productos.models import Producto
from src.unidades_medida import services as unidades_medida_services
from src.lotes_produccion import exceptions as lotes_exceptions



def _validar_producto(db: Session, producto: schemas.ProductoBase, producto_id: Optional[int] = None) -> None:
    """Aplica las reglas comunes al alta y a la modificacion de un producto."""
    if producto.stock < 0:
        raise exceptions.StockNegativo()

    unidades_medida_services.leer_unidad_medida(db, producto.unidad_medida_id)

    consulta = select(Producto.id).where(func.lower(Producto.nombre) == producto.nombre.lower())
    if producto_id is not None:
        consulta = consulta.where(Producto.id != producto_id)
    if db.scalar(consulta) is not None:
        raise exceptions.NombreDuplicado()


def crear_producto(db: Session, producto: schemas.ProductoCreate) -> Producto:
    _validar_producto(db, producto)

    db_producto = Producto(**producto.model_dump())
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto


def listar_productos(db: Session) -> List[Producto]:
    return list(
        db.scalars(
            select(Producto)
            .options(selectinload(Producto.unidad_medida))
            .order_by(Producto.nombre)
        ).all()
    )


def leer_producto(db: Session, producto_id: int) -> Producto:
    db_producto = db.get(Producto, producto_id)
    if db_producto is None:
        raise exceptions.ProductoNoEncontrado()
    return db_producto


def modificar_producto(db: Session, producto_id: int, producto: schemas.ProductoUpdate) -> Producto:
    db_producto = leer_producto(db, producto_id)
    _validar_producto(db, producto, producto_id)

    for campo, valor in producto.model_dump().items():
        setattr(db_producto, campo, valor)
    db.commit()
    db.refresh(db_producto)
    return db_producto


def listar_lotes_de_producto(db: Session, producto_id: int) -> List[LoteProduccion]:
    """Devuelve los lotes del producto, del mas reciente al mas antiguo."""
    leer_producto(db, producto_id)
    return list(
        db.scalars(
            select(LoteProduccion)
            .where(LoteProduccion.producto_id == producto_id)
            .order_by(LoteProduccion.fecha.desc(), LoteProduccion.nro_lote.desc())
        ).all()
    )

def obtener_estadisticas_produccion(
    db: Session,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
) -> schemas.EstadisticasProduccion:

    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise lotes_exceptions.RangoFechasInvalido()

    consulta = (
        select(
            LoteProduccion.fecha.label("fecha"),
            Producto.id.label("producto_id"),
            Producto.nombre.label("producto"),
            UnidadMedida.id.label("unidad_id"),
            UnidadMedida.nombre.label("unidad_nombre"),
            UnidadMedida.magnitud.label("unidad_magnitud"),
            UnidadMedida.factor_base.label("unidad_factor_base"),
            func.sum(LoteProduccion.cantidad).label("cantidad"),
        )
        .join(Producto, LoteProduccion.producto_id == Producto.id)
        .join(UnidadMedida, Producto.unidad_medida_id == UnidadMedida.id)
    )

    if fecha_desde is not None:
        consulta = consulta.where(LoteProduccion.fecha >= fecha_desde)

    if fecha_hasta is not None:
        consulta = consulta.where(LoteProduccion.fecha <= fecha_hasta)

    consulta = consulta.group_by(
        LoteProduccion.fecha,
        Producto.id,
        Producto.nombre,
        UnidadMedida.id,
        UnidadMedida.nombre,
        UnidadMedida.magnitud,
        UnidadMedida.factor_base,
    ).order_by(
        LoteProduccion.fecha,
        Producto.nombre,
    )

    resultados = db.execute(consulta).all()

    evolucion = []
    totales = {}

    for fila in resultados:
        unidad = {
            "id": fila.unidad_id,
            "nombre": fila.unidad_nombre,
            "magnitud": fila.unidad_magnitud,
            "factor_base": fila.unidad_factor_base,
        }

        cantidad = float(fila.cantidad)

        evolucion.append({
            "fecha": fila.fecha,
            "producto_id": fila.producto_id,
            "producto": fila.producto,
            "unidad_medida": unidad,
            "cantidad": cantidad,
        })

        if fila.producto_id not in totales:
            totales[fila.producto_id] = {
                "producto_id": fila.producto_id,
                "producto": fila.producto,
                "unidad_medida": unidad,
                "cantidad": 0.0,
            }

        totales[fila.producto_id]["cantidad"] += cantidad

    return schemas.EstadisticasProduccion(
        totales_por_producto=sorted(
            totales.values(),
            key=lambda item: item["producto"].lower(),
        ),
        evolucion_por_producto=evolucion,
    )