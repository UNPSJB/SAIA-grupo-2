from typing import Optional
from datetime import date

from pydantic import BaseModel, ConfigDict

from src.productos.schemas import Producto
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo

# --- Detalle Receta ---
class DetalleRecetaBase(BaseModel):
    insumo_id: int
    cantidad_gramos: float
    tipo_uso: TipoUsoInsumo
    aditivo_id: Optional[int] = None

class DetalleRecetaCreate(DetalleRecetaBase):
    pass

class DetalleReceta(DetalleRecetaBase):
    receta_id: int
    nro_version: int
    renglon: int
    model_config = ConfigDict(from_attributes=True)

# --- Receta ---
class RecetaBase(BaseModel):
    producto_id: int

class RecetaCreate(RecetaBase):
    version_inicial: VersionRecetaInicialCreate

class Receta(RecetaBase):
    id: int
    producto: Producto
    model_config = ConfigDict(from_attributes=True)

# --- Version Receta ---
class VersionRecetaInicialCreate(BaseModel):
    rendimiento_final_gramos: float
    unidad_venta_gramos: float
    fecha_vigencia: Optional[date] = None
    detalles: list[DetalleRecetaCreate]

class VersionRecetaBase(BaseModel):
    receta_id: int
    version: int
    rendimiento_final_gramos: float
    unidad_venta_gramos: float
    fecha_vigencia: Optional[date] = None

class VersionRecetaCreate(VersionRecetaBase):
    detalles: list[DetalleRecetaCreate]
    pass

class VersionReceta(VersionRecetaBase):
    estado: EstadoVersionReceta
    model_config = ConfigDict(from_attributes=True)

