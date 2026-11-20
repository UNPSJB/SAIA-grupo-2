from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from src.documentacion.schemas import EmpleadoResumen
from src.parametros_normativos.constants import Agregado, EstadoConjunto, SelloAdvertencia
from src.productos.constants import TipoProducto
from src.rotulado_frontal.constants import ResultadoAplicabilidad


class MarcasAgregados(BaseModel):
    agrega_azucares: bool = False
    agrega_grasas: bool = False
    agrega_sodio: bool = False
    contiene_edulcorantes: bool = False
    contiene_cafeina: bool = False


class DatosAplicabilidad(MarcasAgregados):
    """Respuestas sobre el producto. Las marcas se proponen desde la receta vigente y se pueden corregir."""

    envasado_en_ausencia_del_cliente: bool
    excepcion: Optional[str] = None


class NuevaEvaluacion(DatosAplicabilidad):
    empleado_id: int


class ProductoResumen(BaseModel):
    id: int
    nombre: str
    tipo: TipoProducto

    model_config = ConfigDict(from_attributes=True)


class ParametrosUsados(BaseModel):
    id: int
    version: int
    estado: EstadoConjunto
    norma_origen: str
    fecha_vigencia: date

    model_config = ConfigDict(from_attributes=True)


class SelloAplicable(BaseModel):
    sello: SelloAdvertencia
    texto: str
    es_leyenda: bool


class Evaluacion(DatosAplicabilidad):
    id: int
    producto: ProductoResumen
    version_receta: Optional[int] = None
    marcas_corregidas: bool = False
    resultado: ResultadoAplicabilidad
    sellos_a_evaluar: List[SelloAplicable]
    leyendas: List[SelloAplicable]
    parametros: ParametrosUsados
    fecha: datetime
    evaluado_por: EmpleadoResumen


class EstadoProducto(BaseModel):
    producto: ProductoResumen
    evaluacion: Optional[Evaluacion] = None


class InsumoResumen(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class MarcaInsumo(MarcasAgregados):
    """Lo que aporta un insumo al producto cuando se usa en la receta. Sin revisar, no marca nada."""

    insumo: InsumoResumen
    revisado: bool = False
    fecha_cambio: Optional[datetime] = None
    cambiado_por: Optional[EmpleadoResumen] = None


class CambioMarcaInsumo(MarcasAgregados):
    insumo_id: int


class ActualizacionMarcasInsumos(BaseModel):
    empleado_id: int
    marcas: List[CambioMarcaInsumo]


class OrigenMarca(BaseModel):
    agregado: Agregado
    insumo: str
    aditivo: Optional[str] = None
    clase_funcional: Optional[str] = None


class PropuestaMarcas(MarcasAgregados):
    """Marcas que surgen de la version vigente de la receta, con el renglon que origina cada una."""

    tiene_receta: bool
    version_receta: Optional[int] = None
    origenes: List[OrigenMarca] = []
    insumos_sin_revisar: List[InsumoResumen] = []
