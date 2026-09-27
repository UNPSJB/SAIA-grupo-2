import logging
from typing import List
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from src.consumos.models import ConsumoLimpieza
from src.insumos.models import Insumo
from src.unidades_medida.models import UnidadMedida
from src.consumos import schemas, exceptions

logger = logging.getLogger(__name__)

def registrar_consumo(db: Session, consumo: schemas.ConsumoCreate) -> schemas.Consumo:
    if consumo.cantidad_consumida <= 0:
        raise exceptions.CantidadInvalida()
        
    _consumo = ConsumoLimpieza(**consumo.model_dump())
    db.add(_consumo)
    db.commit()
    db.refresh(_consumo)
    return _consumo

def obtener_consumo_acumulado(db: Session) -> List[schemas.ConsumoAcumulado]:
    resultados = db.execute(
        select(
            Insumo.id.label('insumo_id'),
            Insumo.nombre.label('nombre_insumo'),
            UnidadMedida.nombre.label('unidad_medida'),
            func.sum(ConsumoLimpieza.cantidad_consumida).label('cantidad_total')
        )
        .join(ConsumoLimpieza, ConsumoLimpieza.insumo_id == Insumo.id)
        .join(UnidadMedida, Insumo.unidad_medida_id == UnidadMedida.id)
        .group_by(Insumo.id, Insumo.nombre, UnidadMedida.nombre)
    ).all()

    return [
        schemas.ConsumoAcumulado(
            insumo_id=row.insumo_id,
            nombre_insumo=row.nombre_insumo,
            unidad_medida=row.unidad_medida,
            cantidad_total=row.cantidad_total
        ) for row in resultados
    ]