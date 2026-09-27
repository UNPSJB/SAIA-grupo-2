from pydantic import BaseModel, ConfigDict
from datetime import date
from src.productos_limpieza.schemas import ProductoLimpieza

class ConsumoBase(BaseModel):
    producto_limpieza_id: int
    cantidad_consumida: float
    tarea_id: int
    fecha_registro: date

class ConsumoCreate(ConsumoBase):
    pass

class Consumo(ConsumoBase):
    id: int
    producto_limpieza: ProductoLimpieza
    
    model_config = ConfigDict(from_attributes=True)

class ConsumoAcumulado(BaseModel):
    producto_limpieza_id: int 
    nombre_producto: str
    unidad_medida: str
    cantidad_total: float
    
    model_config = ConfigDict(from_attributes=True)

class ConsumoDetallado(BaseModel):
    id: int
    fecha_registro: date
    nombre_producto: str
    titulo_tarea: str
    cantidad_consumida: float
    unidad_medida: str
    
    model_config = ConfigDict(from_attributes=True)