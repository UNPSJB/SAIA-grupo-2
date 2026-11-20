from typing import List, Optional
from pydantic import BaseModel, Field

class RecetaEscaladaBase(BaseModel):
    factor: Optional[float] = Field(None, gt=0)
    cantidad_objetivo: Optional[float] = Field(None, gt=0)



class RenglonEscalado(BaseModel):
    insumo_id: int
    insumo_nombre: str
    unidad_medida_id: int
    unidad_medida_nombre: str
    magnitud: str
    cantidad_original: float
    cantidad_escalada: float
    stock_disponible: float
    stock_suficiente: bool


class RecetaEscalada(BaseModel):
    receta_version_id: int
    producto_id: int
    rendimiento_original: float
    rendimiento_esperado: float
    unidad_producto_nombre: str
    factor_aplicado: float
    renglones: List[RenglonEscalado]