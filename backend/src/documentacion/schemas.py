from datetime import date
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

from src.documentacion.constants import TipoDocumentacion
from src.vencimientos import EstadoVencimiento

TextoCorto = Annotated[str, Field(min_length=2, max_length=50, strip_whitespace=True)]
TextoLargo = Annotated[str, Field(min_length=2, max_length=150, strip_whitespace=True)]


class DocumentacionBase(BaseModel):
    empleado_id: int
    fecha_vencimiento: date


class LibretaSanitariaCreate(DocumentacionBase):
    tipo: Literal[TipoDocumentacion.LIBRETA_SANITARIA]
    numero_carnet: TextoCorto
    autoridad_emisora: TextoLargo


class CapacitacionCreate(DocumentacionBase):
    tipo: Literal[TipoDocumentacion.CAPACITACION]
    titulo: TextoLargo
    observaciones: Optional[Annotated[str, Field(max_length=300)]] = None


class CertificadoAptitudFisicaCreate(DocumentacionBase):
    tipo: Literal[TipoDocumentacion.CERTIFICADO_APTITUD_FISICA]
    nombre_medico: TextoLargo
    matricula: TextoCorto


DocumentacionCreate = Annotated[
    Union[LibretaSanitariaCreate, CapacitacionCreate, CertificadoAptitudFisicaCreate],
    Field(discriminator="tipo"),
]


class DocumentacionUpdate(BaseModel):
    fecha_vencimiento: date
    numero_carnet: Optional[TextoCorto] = None
    autoridad_emisora: Optional[TextoLargo] = None
    titulo: Optional[TextoLargo] = None
    observaciones: Optional[Annotated[str, Field(max_length=300)]] = None
    nombre_medico: Optional[TextoLargo] = None
    matricula: Optional[TextoCorto] = None


class EmpleadoResumen(BaseModel):
    id: int
    legajo: str
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)


class Documentacion(BaseModel):
    id: int
    empleado_id: int
    tipo: TipoDocumentacion
    fecha_vencimiento: date
    dias_restantes: int
    estado: EstadoVencimiento
    dias_aviso_previo: int
    empleado: EmpleadoResumen

    numero_carnet: Optional[str] = None
    autoridad_emisora: Optional[str] = None
    titulo: Optional[str] = None
    observaciones: Optional[str] = None
    nombre_medico: Optional[str] = None
    matricula: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlertaVencimiento(BaseModel):
    id: int
    tipo: TipoDocumentacion
    descripcion: str
    empleado: EmpleadoResumen
    fecha_vencimiento: date
    dias_restantes: int
    estado: EstadoVencimiento

    model_config = ConfigDict(from_attributes=True)


class DocumentacionDelete(BaseModel):
    id: int
    msg: str

    model_config = ConfigDict(from_attributes=True)


class RequisitoDocumentacion(BaseModel):
    tipo: TipoDocumentacion
    obligatorio: bool
    dias_aviso_previo: int

    model_config = ConfigDict(from_attributes=True)


class RequisitoUpdate(BaseModel):
    obligatorio: Optional[bool] = None
    dias_aviso_previo: Optional[Annotated[int, Field(gt=0, le=365)]] = None


class CumplimientoEmpleado(BaseModel):
    empleado: EmpleadoResumen
    completo: bool
    faltantes: list[TipoDocumentacion]
    vencidos: list[TipoDocumentacion]

    model_config = ConfigDict(from_attributes=True)
