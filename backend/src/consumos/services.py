import logging
from typing import List
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from src.consumos.models import ConsumoLimpieza
from src.productos_limpieza.models import ProductoLimpieza
from src.unidades_medida.models import UnidadMedida
from src.tareas.models import Tarea
from src.consumos import schemas, exceptions
from datetime import date

from src.productos_limpieza.services import descontar_stock
from src.tareas.services import leer_tarea

logger = logging.getLogger(__name__)

def registrar_consumo(db: Session, consumo: schemas.ConsumoCreate) -> schemas.Consumo:
    if consumo.cantidad_consumida <= 0:
        raise exceptions.CantidadInvalida()

    leer_tarea(db, consumo.tarea_id)

    descontar_stock(
        db=db, 
        producto_id= consumo.producto_limpieza_id, 
        cantidad=consumo.cantidad_consumida
    )


    _consumo = ConsumoLimpieza(**consumo.model_dump())
    db.add(_consumo)
    db.commit()
    db.refresh(_consumo)
    return _consumo
def obtener_reporte_consumos(
    db: Session, 
    fecha_inicio: date | None = None, 
    fecha_fin: date | None = None, 
    acumulado: bool = True
):
    if acumulado:
        stmt = select(
            ProductoLimpieza.id.label('producto_limpieza_id'),
            ProductoLimpieza.nombre.label('nombre_producto'),
            UnidadMedida.nombre.label('unidad_medida'),
            func.sum(ConsumoLimpieza.cantidad_consumida).label('cantidad_total')
        ).join(ConsumoLimpieza, ConsumoLimpieza.producto_limpieza_id == ProductoLimpieza.id)\
         .join(UnidadMedida, ProductoLimpieza.unidad_medida_id == UnidadMedida.id)
        
        if fecha_inicio:
            stmt = stmt.where(ConsumoLimpieza.fecha_registro >= fecha_inicio)
        if fecha_fin:
            stmt = stmt.where(ConsumoLimpieza.fecha_registro <= fecha_fin)
            
        stmt = stmt.group_by(ProductoLimpieza.id, ProductoLimpieza.nombre, UnidadMedida.nombre)
        resultados = db.execute(stmt).all()
        
        return [schemas.ConsumoAcumulado(**row._mapping) for row in resultados]
    
    else:
        stmt = select(
            ConsumoLimpieza.id,
            ConsumoLimpieza.fecha_registro,
            ProductoLimpieza.nombre.label('nombre_producto'),
            Tarea.titulo.label('titulo_tarea'),
            ConsumoLimpieza.cantidad_consumida,
            UnidadMedida.nombre.label('unidad_medida')
        ).join(ProductoLimpieza, ConsumoLimpieza.producto_limpieza_id == ProductoLimpieza.id)\
         .join(UnidadMedida, ProductoLimpieza.unidad_medida_id == UnidadMedida.id)\
         .join(Tarea, ConsumoLimpieza.tarea_id == Tarea.id)
        if fecha_inicio:
            stmt = stmt.where(ConsumoLimpieza.fecha_registro >= fecha_inicio)
        if fecha_fin:
            stmt = stmt.where(ConsumoLimpieza.fecha_registro <= fecha_fin)
            
        stmt = stmt.order_by(ConsumoLimpieza.fecha_registro.desc())
        resultados = db.execute(stmt).all()
        
        return [schemas.ConsumoDetallado(**row._mapping) for row in resultados]