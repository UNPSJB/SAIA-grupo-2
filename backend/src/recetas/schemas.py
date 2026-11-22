from typing import Optional, List
from datetime import date
from src.datos_nutricionales.constants import EstadoTablaNutricional
from pydantic import BaseModel, ConfigDict, Field
from src.productos.schemas import Producto
from src.equipos.schemas import Equipo
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo
from src.datos_nutricionales.schemas import FaltanteNutricionalInsumo 

class PasoRecetaBase(BaseModel):
    orden: int = 1
    nombre_paso: str
    procedimiento: str
    equipo_id: Optional[int] = None
    tiempo_minutos: Optional[int] = None
    temperatura_celsius: Optional[float] = None
    es_punto_control: bool = False

class PasoRecetaCreate(PasoRecetaBase):
    pass

class PasoReceta(PasoRecetaBase):
    id: int
    receta_id: int
    version: int
    equipo: Optional[Equipo] = None
    model_config = ConfigDict(from_attributes=True)

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

class VersionRecetaInicialCreate(BaseModel):
    rendimiento_final_gramos: float
    unidad_venta_gramos: float
    medida_casera: Optional[str] = None
    motivo_cambio: Optional[str] = "Creación inicial de la receta"
    creado_por_id: Optional[int] = None
    fecha_vigencia: Optional[date] = None
    detalles: List[DetalleRecetaCreate] = []
    pasos: List[PasoRecetaCreate] = []

class VersionRecetaBase(BaseModel):
    rendimiento_final_gramos: float
    unidad_venta_gramos: float
    medida_casera: Optional[str] = None
    motivo_cambio: Optional[str] = None
    creado_por_id: Optional[int] = None
    fecha_vigencia: Optional[date] = None

class VersionRecetaCreate(VersionRecetaBase):
    detalles: List[DetalleRecetaCreate] = []
    pasos: List[PasoRecetaCreate] = []

class VersionReceta(VersionRecetaBase):
    receta_id: int
    version: int
    estado: EstadoVersionReceta
    detalles: List[DetalleReceta] = []
    pasos: List[PasoReceta] = []
    model_config = ConfigDict(from_attributes=True)

class RecetaBase(BaseModel):
    producto_id: int

class RecetaCreate(RecetaBase):
    version_inicial: VersionRecetaInicialCreate

class Receta(RecetaBase):
    id: int
    producto: Producto
    model_config = ConfigDict(from_attributes=True)

class ItemInformacionNutricionalResponse(BaseModel):
    nutriente: str
    unidad: str
    valor_100g_raw: float
    valor_100g_expresado: str
    valor_porcion_raw: float
    valor_porcion_expresado: str
    porcentaje_vd: Optional[float] = None
    porcentaje_vd_expresado: str = "-"

#  nuevo para mostrar a que insumos le faltan datos
# class FaltanteNutricionalInsumo(BaseModel):
#     insumo_id: int
#     insumo_nombre: str
#     tipo_uso: str = "ingrediente"
#     datos_faltantes: List[str] = []
#     sin_fuente: List[str] = []

# class TablaNutricionalRecetaResponse(BaseModel):
#     receta_id: int
#     version: int
#     rendimiento_final_gramos: float
#     unidad_venta_gramos: float
#     medida_casera: Optional[str] = None
#     estado: str = "completa"                              #nuevo. estado de la receta
#     faltantes: List[FaltanteNutricionalInsumo] = []       # nuevo. lista de lo que falta
#     items: List[ItemInformacionNutricionalResponse] = []


class TablaNutricionalRecetaResponse(BaseModel):
    receta_id: int
    version: int
    rendimiento_final_gramos: float
    unidad_venta_gramos: float
    medida_casera: Optional[str] = None
    estado: EstadoTablaNutricional = EstadoTablaNutricional.COMPLETA
    faltantes: List[FaltanteNutricionalInsumo] = Field(default_factory=list)
    items: List[ItemInformacionNutricionalResponse] = []