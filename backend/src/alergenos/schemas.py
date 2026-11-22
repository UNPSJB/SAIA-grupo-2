from datetime import datetime
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from src.alergenos.constants import Alergeno, EstadoDeclaracion, UnidadDuracion
from src.documentacion.schemas import EmpleadoResumen
from src.productos.constants import TipoProducto

Instrucciones = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]


def ordenar_alergenos(alergenos: List[Alergeno]) -> List[Alergeno]:
    """Sin repetidos y en el orden del articulo 235 septimo."""
    orden = list(Alergeno)
    return sorted(set(alergenos), key=orden.index)


class MarcaAlergenos(BaseModel):
    alergenos: List[Alergeno] = []
    contiene_gluten: bool = False

    @field_validator("alergenos")
    @classmethod
    def normalizar(cls, alergenos: List[Alergeno]) -> List[Alergeno]:
        return ordenar_alergenos(alergenos)


class InsumoResumen(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class MarcaInsumo(MarcaAlergenos):
    insumo: InsumoResumen
    revisado: bool = False
    fecha_cambio: Optional[datetime] = None
    cambiado_por: Optional[EmpleadoResumen] = None


class CambioMarcaInsumo(MarcaAlergenos):
    insumo_id: int


class ActualizacionMarcas(BaseModel):
    empleado_id: int
    marcas: List[CambioMarcaInsumo]


class AlergenoPropuesto(BaseModel):
    alergeno: Alergeno
    insumos: List[str]


class Propuesta(BaseModel):
    """Lo que el sistema sugiere declarar a partir de la version vigente de la receta y las marcas de sus insumos."""

    tiene_receta: bool
    version_receta: Optional[int] = None
    contiene: List[AlergenoPropuesto] = []
    contiene_gluten: bool = False
    insumos_con_gluten: List[str] = []
    insumos_sin_revisar: List[InsumoResumen] = []


class DeclaracionUpdate(BaseModel):
    empleado_id: int
    contiene: List[Alergeno] = []
    contiene_gluten: bool = False
    puede_contener: List[Alergeno] = []
    confirmar: bool = False

    @field_validator("contiene", "puede_contener")
    @classmethod
    def normalizar(cls, alergenos: List[Alergeno]) -> List[Alergeno]:
        return ordenar_alergenos(alergenos)


class Declaracion(BaseModel):
    contiene: List[Alergeno]
    contiene_gluten: bool
    puede_contener: List[Alergeno]
    estado: EstadoDeclaracion
    version_receta: Optional[int] = None
    modificada_respecto_de_la_propuesta: bool
    fecha_modificacion: datetime
    modificado_por: EmpleadoResumen
    fecha_confirmacion: Optional[datetime] = None
    confirmado_por: Optional[EmpleadoResumen] = None


class DatosConservacion(BaseModel):
    temperatura_minima: Optional[float] = Field(default=None, ge=-60, le=100)
    temperatura_maxima: Optional[float] = Field(default=None, ge=-60, le=100)
    duracion: Optional[int] = Field(default=None, gt=0)
    unidad_duracion: UnidadDuracion = UnidadDuracion.DIAS
    instrucciones: Optional[Instrucciones] = None


class ConservacionUpdate(DatosConservacion):
    empleado_id: int


class Conservacion(DatosConservacion):
    fecha_modificacion: datetime
    modificado_por: EmpleadoResumen


class Leyendas(BaseModel):
    contiene: Optional[str] = None
    puede_contener: Optional[str] = None
    conservacion: Optional[str] = None


class ProductoResumen(BaseModel):
    id: int
    nombre: str
    tipo: TipoProducto

    model_config = ConfigDict(from_attributes=True)


class DetalleProducto(BaseModel):
    producto: ProductoResumen
    propuesta: Propuesta
    declaracion: Optional[Declaracion] = None
    propuesta_cambio: bool = False
    conservacion: Optional[Conservacion] = None
    leyendas: Leyendas


class ResumenProducto(BaseModel):
    """Estado de un producto: lo declarado si hay declaracion guardada, si no lo que sugiere el sistema."""

    producto: ProductoResumen
    tiene_receta: bool
    estado: EstadoDeclaracion
    guardada: bool
    propuesta_cambio: bool
    contiene: List[Alergeno]
    contiene_gluten: bool
    puede_contener: List[Alergeno]
    leyenda_conservacion: Optional[str] = None
