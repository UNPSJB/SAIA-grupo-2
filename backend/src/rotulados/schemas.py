
from datetime import date, datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.alergenos.constants import EstadoDeclaracion
from src.datos_nutricionales.constants import EstadoTablaNutricional
from src.parametros_normativos.constants import SelloAdvertencia
from src.productos.constants import TipoProducto
from src.rotulado_frontal.constants import ResultadoAplicabilidad


class RotuloDatos(BaseModel):
    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[float] = Field(default=None, gt=0)
    unidad_contenido_neto: Optional[str] = None
    rnpa_rppa: Optional[str] = None

    razon_social: Optional[str] = None
    domicilio: Optional[str] = None

    es_importado: bool = False
    razon_social_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    pais_origen: Optional[str] = None

    instrucciones_uso: Optional[str] = None
    instrucciones_conservacion: Optional[str] = None


class RotuloCrear(RotuloDatos):
    producto_id: int


class RotuloActualizar(BaseModel):
    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[float] = Field(default=None, gt=0)
    unidad_contenido_neto: Optional[str] = None
    rnpa_rppa: Optional[str] = None

    razon_social: Optional[str] = None
    domicilio: Optional[str] = None

    es_importado: Optional[bool] = None
    razon_social_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    pais_origen: Optional[str] = None

    instrucciones_uso: Optional[str] = None
    instrucciones_conservacion: Optional[str] = None
    lista_ingredientes: Optional[str] = None


class RotuloRespuesta(RotuloDatos):
    model_config = ConfigDict(from_attributes=True)

    id: int
    producto_id: int

    ingredientes_snapshot: Optional[dict[str, Any]] = None
    nutricion_snapshot: Optional[dict[str, Any]] = None
    sellos_snapshot: Optional[list[str]] = None
    calculo_sellos_id: Optional[int] = None
    lista_ingredientes: Optional[str] = None

    receta_id: Optional[int] = None
    receta_version: Optional[int] = None

    fecha_creacion: datetime
    fecha_actualizacion: datetime


class RotuloLoteCrear(BaseModel):
    nro_lote: int
    fecha_duracion: Optional[date] = None


class RotuloLoteActualizar(BaseModel):
    fecha_duracion: Optional[date] = None


class RotuloLoteRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rotulo_id: int
    nro_lote: int
    fecha_duracion: Optional[date] = None
    fecha_creacion: datetime


class HistorialCambioRotuloRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rotulo_id: int
    campo: str
    valor_original: Optional[str] = None
    valor_nuevo: Optional[str] = None
    empleado_id: Optional[int] = None
    empleado_nombre: Optional[str] = None
    empleado_apellido: Optional[str] = None
    fecha_cambio: datetime


class Completitud(BaseModel):
    rotulo_id: int
    porcentaje_completitud: float
    completo: bool
    faltantes: List[str]


class ProductoVista(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    tipo: TipoProducto


class SelloVista(BaseModel):
    sello: SelloAdvertencia
    texto: str


class CaraPrincipal(BaseModel):
    """Lo que va en la cara principal: denominacion, contenido neto y el sistema de advertencias."""

    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[float] = None
    unidad_contenido_neto: Optional[str] = None
    aplica_advertencias: Optional[bool] = None
    resultado_aplicabilidad: Optional[ResultadoAplicabilidad] = None
    motivo: Optional[str] = None
    sellos: List[SelloVista] = []
    leyendas: List[SelloVista] = []
    calculo_provisorio: bool = False
    parametros_version: Optional[int] = None
    parametros_fecha_vigencia: Optional[date] = None
    receta_version_calculo: Optional[int] = None


class OrigenVista(BaseModel):
    razon_social: Optional[str] = None
    domicilio: Optional[str] = None
    rnpa_rppa: Optional[str] = None
    es_importado: bool = False
    razon_social_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    pais_origen: Optional[str] = None


class AlergenosVista(BaseModel):
    contiene: Optional[str] = None
    puede_contener: Optional[str] = None
    estado: Optional[EstadoDeclaracion] = None


class LoteVista(BaseModel):
    rotulo_lote_id: int
    nro_lote: int
    fecha_elaboracion: date
    fecha_duracion: Optional[date] = None


class FilaNutricionalVista(BaseModel):
    nutriente: str
    nombre: str
    subnivel: bool
    valor_100g: str
    valor_porcion: str
    porcentaje_vd: str


class TablaNutricionalVista(BaseModel):
    estado: EstadoTablaNutricional
    porcion_gramos: float
    medida_casera: Optional[str] = None
    filas: List[FilaNutricionalVista]
    insumos_sin_datos: List[str] = []
    nota_pie: str


class VistaPreviaRotulo(BaseModel):
    """Borrador del rotulo armado con los datos guardados, mas las advertencias que hay que revisar antes de usarlo."""

    rotulo_id: int
    producto: ProductoVista
    leyenda_borrador: str
    cara_principal: CaraPrincipal
    lista_ingredientes: Optional[str] = None
    alergenos: AlergenosVista
    origen: OrigenVista
    lote: Optional[LoteVista] = None
    lotes: List[LoteVista] = []
    conservacion: Optional[str] = None
    instrucciones_uso: Optional[str] = None
    tabla_nutricional: Optional[TablaNutricionalVista] = None
    receta_version: Optional[int] = None
    receta_version_vigente: Optional[int] = None
    advertencias: List[str]
    faltantes: List[str]
    completo: bool
    fecha_generacion: datetime
