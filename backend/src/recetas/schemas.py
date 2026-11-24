from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator
from src.productos.schemas import Producto
from src.equipos.schemas import Equipo
from src.documentacion.schemas import EmpleadoResumen
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo, FormatoDeclaracionAditivos
from src.datos_nutricionales.constants import EstadoTablaNutricional

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
    cantidad_original: float = Field(..., gt=0)
    unidad_medida_id: int = Field(default=1, gt=0)
    tipo_uso: TipoUsoInsumo
    aditivo_id: Optional[int] = None
    cantidad_gramos: Optional[float] = Field(default=None, gt=0)

    @model_validator(mode="before")
    @classmethod
    def compatibilidad_cantidad_gramos(cls, valores):
        if not isinstance(valores, dict):
            return valores

        valores = valores.copy()

        if "cantidad_original" not in valores and valores.get("cantidad_gramos") is not None:
            valores["cantidad_original"] = valores["cantidad_gramos"]
            valores.setdefault("unidad_medida_id", 1)

        return valores


class DetalleRecetaCreate(DetalleRecetaBase):
    pass

class DetalleReceta(DetalleRecetaBase):
    receta_id: int
    nro_version: int
    renglon: int
    model_config = ConfigDict(from_attributes=True)

class VersionRecetaInicialCreate(BaseModel):
    rendimiento_final_gramos: float
    rendimiento_unidades: Optional[float] = Field(default=None, gt=0)
    unidad_venta_gramos: float
    medida_casera: Optional[str] = None
    motivo_cambio: Optional[str] = "Creación inicial de la receta"
    creado_por_id: Optional[int] = None
    fecha_vigencia: Optional[date] = None
    detalles: List[DetalleRecetaCreate] = []
    pasos: List[PasoRecetaCreate] = []

class VersionRecetaBase(BaseModel):
    rendimiento_final_gramos: float
    rendimiento_unidades: Optional[float] = Field(default=None, gt=0)
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

class RecetaEscaladaBase(BaseModel):
    """Se indica uno solo: factor, gramos de producto terminado o unidades de venta a producir."""

    factor: Optional[float] = Field(None, gt=0)
    cantidad_objetivo: Optional[float] = Field(None, gt=0)
    unidades_objetivo: Optional[float] = Field(None, gt=0)

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
    receta_id: int
    receta_version_id: int
    producto_id: int
    rendimiento_original: float
    rendimiento_esperado: float
    cantidad_producto: Optional[float] = None
    peso_unidad_gramos: Optional[float] = None
    unidad_producto_id: int
    unidad_producto_nombre: str
    factor_aplicado: float
    renglones: List[RenglonEscalado]

class ItemInformacionNutricionalResponse(BaseModel):
    nutriente: str
    unidad: str
    valor_100g_raw: float
    valor_100g_expresado: str
    valor_porcion_raw: float
    valor_porcion_expresado: str
    porcentaje_vd: Optional[float] = None
    porcentaje_vd_expresado: str = "-"


class TablaNutricionalRecetaResponse(BaseModel):
    receta_id: int
    version: int
    rendimiento_final_gramos: float
    unidad_venta_gramos: float
    medida_casera: Optional[str] = None
    estado: EstadoTablaNutricional = EstadoTablaNutricional.COMPLETA
    faltantes: List[FaltanteNutricionalInsumo] = Field(default_factory=list)
    items: List[ItemInformacionNutricionalResponse] = []

class ItemComposicionResponse(BaseModel):
    renglon: int
    insumo_id: int
    nombre_insumo: str
    cantidad_gramos: float
    porcentaje: float
    tipo_uso: TipoUsoInsumo
    aditivo_id: Optional[int] = None

class ComposicionRecetaResponse(BaseModel):
    receta_id: int
    version: int
    total_gramos: float
    ingredientes: List[ItemComposicionResponse]
    aditivos: List[ItemComposicionResponse]
    suma_porcentajes: float
    suma_correcta: bool

class ConfiguracionProduccionResponse(BaseModel):
    id: int
    formato_declaracion_aditivos: FormatoDeclaracionAditivos
    model_config = ConfigDict(from_attributes=True)

class ConfiguracionProduccionUpdate(BaseModel):
    formato_declaracion_aditivos: FormatoDeclaracionAditivos

class IngredienteRotuloItem(BaseModel):
    insumo_id: int
    nombre_insumo: str
    denominacion_rotulo: str
    cantidad_gramos: float
    porcentaje: float
    renglon_original: int

class AditivoRotuloItem(BaseModel):
    aditivo_id: int
    insumo_id: int
    nombre_completo: str
    numero_ins: Optional[str] = None
    texto_formateado: str

class GrupoAditivosRotulo(BaseModel):
    clase_funcional_id: int
    clase_funcional: str
    es_aromatizante: bool
    texto_grupo: str
    aditivos: List[AditivoRotuloItem]

class ListaIngredientesRotuloResponse(BaseModel):
    receta_id: int
    version: int
    es_orden_manual: bool
    orden_manual_por: Optional[EmpleadoResumen] = None
    orden_manual_fecha: Optional[datetime] = None
    aviso_orden_anterior: Optional[str] = None
    formato_aditivos: FormatoDeclaracionAditivos
    ingredientes: List[IngredienteRotuloItem]
    grupos_aditivos: List[GrupoAditivosRotulo]
    texto_rotulo: str

class AjusteOrdenIngredientesPayload(BaseModel):
    orden_insumo_ids: List[int]
    empleado_id: Optional[int] = None