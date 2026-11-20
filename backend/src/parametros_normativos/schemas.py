from datetime import date, datetime
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from src.datos_nutricionales.constants import Nutriente
from src.documentacion.schemas import EmpleadoResumen
from src.parametros_normativos.constants import (
    Agregado,
    ClaveParametro,
    CondicionCriterio,
    EstadoConjunto,
    FormaCriterio,
    SelloAdvertencia,
)
from src.productos.constants import TipoProducto

TextoCorto = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
TextoLargo = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]
TextoNombreClase = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]


class CriterioSello(BaseModel):
    id: int
    sello: SelloAdvertencia
    tipo_producto: TipoProducto
    forma: FormaCriterio
    nutriente: Nutriente
    limite: float
    unidad: str
    factor_energetico: Optional[float] = None
    condicion: CondicionCriterio

    model_config = ConfigDict(from_attributes=True)


class TextoSello(BaseModel):
    sello: SelloAdvertencia
    texto: str
    orden: int

    model_config = ConfigDict(from_attributes=True)


class SelloPorAgregado(BaseModel):
    agregado: Agregado
    sello: SelloAdvertencia

    model_config = ConfigDict(from_attributes=True)


class ClaseAditivoPorAgregado(BaseModel):
    agregado: Agregado
    clase_funcional: str

    model_config = ConfigDict(from_attributes=True)


class ExcepcionRotulado(BaseModel):
    id: int
    descripcion: str

    model_config = ConfigDict(from_attributes=True)


class ParametroGeneral(BaseModel):
    clave: ClaveParametro
    valor: float
    unidad: str
    descripcion: str

    model_config = ConfigDict(from_attributes=True)


class ConjuntoResumen(BaseModel):
    id: int
    version: int
    estado: EstadoConjunto
    norma_origen: str
    fecha_vigencia: date
    fecha_creacion: datetime
    creado_por: Optional[EmpleadoResumen] = None
    fecha_publicacion: Optional[datetime] = None
    publicado_por: Optional[EmpleadoResumen] = None
    vigente: bool = False

    model_config = ConfigDict(from_attributes=True)


class ConjuntoDetalle(ConjuntoResumen):
    notas: Optional[str] = None
    criterios: List[CriterioSello]
    textos: List[TextoSello]
    sellos_por_agregado: List[SelloPorAgregado]
    clases_aditivo: List[ClaseAditivoPorAgregado]
    excepciones: List[ExcepcionRotulado]
    parametros_generales: List[ParametroGeneral]


class NuevoBorrador(BaseModel):
    """Crea una version en borrador copiando la indicada (o la vigente si no se indica)."""

    empleado_id: int
    base_id: Optional[int] = None


class CriterioUpdate(BaseModel):
    id: int
    limite: float
    factor_energetico: Optional[float] = None


class TextoUpdate(BaseModel):
    sello: SelloAdvertencia
    texto: TextoCorto


class ReglaAgregadoUpdate(BaseModel):
    agregado: Agregado
    sellos: List[SelloAdvertencia]


class ClasesAditivoUpdate(BaseModel):
    """Clases funcionales de aditivo que marcan al producto con el agregado. Se guardan en minusculas."""

    agregado: Agregado
    clases: List[TextoNombreClase]

    @field_validator("clases")
    @classmethod
    def normalizar(cls, clases: List[str]) -> List[str]:
        return [clase.lower() for clase in clases]


class ParametroGeneralUpdate(BaseModel):
    clave: ClaveParametro
    valor: float


class BorradorUpdate(BaseModel):
    """Campos a cambiar de un borrador. Los que no se envian quedan como estaban."""

    norma_origen: Optional[TextoLargo] = None
    fecha_vigencia: Optional[date] = None
    notas: Optional[str] = None
    criterios: Optional[List[CriterioUpdate]] = None
    textos: Optional[List[TextoUpdate]] = None
    reglas: Optional[List[ReglaAgregadoUpdate]] = None
    clases_aditivo: Optional[List[ClasesAditivoUpdate]] = None
    excepciones: Optional[List[TextoLargo]] = None
    parametros_generales: Optional[List[ParametroGeneralUpdate]] = None


class Publicacion(BaseModel):
    empleado_id: int


class ModuloRotuladoFrontal(BaseModel):
    activo: bool
    fecha_cambio: Optional[datetime] = None
    cambiado_por: Optional[EmpleadoResumen] = None

    model_config = ConfigDict(from_attributes=True)


class CambioModulo(BaseModel):
    activo: bool
    empleado_id: int


class CriterioImportacion(BaseModel):
    sello: SelloAdvertencia
    tipo_producto: TipoProducto
    forma: FormaCriterio
    nutriente: Nutriente
    limite: float
    unidad: str
    factor_energetico: Optional[float] = None
    condicion: CondicionCriterio = CondicionCriterio.SIEMPRE


class ParametroGeneralImportacion(BaseModel):
    clave: ClaveParametro
    valor: float
    unidad: str
    descripcion: str


class ConjuntoImportacion(BaseModel):
    """Formato del archivo con el que se carga una version completa de parametros (por ejemplo, desde el seed)."""

    norma_origen: str
    fecha_vigencia: date
    notas: Optional[str] = None
    textos: List[TextoUpdate]
    criterios: List[CriterioImportacion]
    reglas: List[ReglaAgregadoUpdate]
    clases_aditivo: List[ClasesAditivoUpdate] = []
    excepciones: List[str]
    parametros_generales: List[ParametroGeneralImportacion]
