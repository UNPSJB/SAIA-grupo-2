from pydantic import BaseModel, ConfigDict
from datetime import date
from src.insumos.schemas import Insumo

class ConsumoBase(BaseModel):
    insumo_id: int
    cantidad_consumida: float
    tarea_asociada: str
    fecha_registro: date

class ConsumoCreate(ConsumoBase):
    pass

class Consumo(ConsumoBase):
    id: int
    insumo: Insumo
    
    model_config = ConfigDict(from_attributes=True)

class ConsumoAcumulado(BaseModel):
    insumo_id: int
    nombre_insumo: str
    unidad_medida: str
    cantidad_total: float
    
    model_config = ConfigDict(from_attributes=True)