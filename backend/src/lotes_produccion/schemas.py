from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.documentacion.schemas import EmpleadoResumen
from src.productos.schemas import ProductoResumen
from src.unidades_medida.constants import MagnitudUnidad


class InsumoUtilizado(BaseModel):
    """Consumo declarado al registrar el lote, en cualquier unidad de la misma magnitud del insumo."""

    insumo_id: int
    cantidad_utilizada: float
    unidad_medida_id: int


class LoteProduccionCreate(BaseModel):
    producto_id: int
    fecha: date
    cantidad: float
    insumos: List[InsumoUtilizado] = Field(default_factory=list)


class LoteProduccion(BaseModel):
    """cerrado_por vacio en un lote cerrado significa que se cerro automaticamente al terminar el dia."""

    nro_lote: int
    producto_id: int
    fecha: date
    cantidad: float
    producto: ProductoResumen
    fecha_registro: datetime
    cerrado: bool
    fecha_cierre: Optional[datetime] = Field(default=None, validation_alias="fecha_cierre_efectiva")
    cerrado_por: Optional[EmpleadoResumen] = None

    model_config = ConfigDict(from_attributes=True)


class CorreccionConsumo(BaseModel):
    """Consumo completo del lote tal como debe quedar: reemplaza al declarado."""

    insumos: List[InsumoUtilizado]


class CierreLote(BaseModel):
    empleado_id: int


class InsumoAsociadoDetalle(BaseModel):
    """cantidad_utilizada esta expresada en la unidad base del insumo (gramos o mililitros)."""

    insumo_id: int
    nombre: str
    cantidad_utilizada: float
    unidad_medida: str
    magnitud: MagnitudUnidad
