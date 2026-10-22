from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.incidentes.constants import (
    LARGO_MAXIMO_DESCRIPCION,
    EstadoIncidente,
    TipoIncidente,
)

Descripcion = Annotated[
    str,
    Field(min_length=3, max_length=LARGO_MAXIMO_DESCRIPCION, strip_whitespace=True),
]
NombreArchivo = Annotated[str, Field(max_length=200, strip_whitespace=True)]


class EmpleadoResumen(BaseModel):
    id: int
    legajo: str
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)


class IncidenteCreate(BaseModel):
    """La fecha, la hora y el estado los pone el servidor."""

    descripcion: Descripcion
    empleado_id: int
    tipo: TipoIncidente = TipoIncidente.OTRO
    archivo_url: Optional[str] = None
    archivo_nombre: Optional[NombreArchivo] = None


class FotoIncidente(BaseModel):
    """Unica modificacion permitida: adjuntar la foto que no se cargo al registrar."""

    archivo_url: str
    archivo_nombre: Optional[NombreArchivo] = None


class Incidente(BaseModel):
    id: int
    descripcion: str
    tipo: TipoIncidente
    estado: EstadoIncidente
    fecha_hora_reporte: datetime
    empleado: EmpleadoResumen
    archivo_url: Optional[str] = None
    archivo_nombre: Optional[str] = None
    dias_abierto: Optional[int] = None

    accion_correctiva: Optional[str] = None
    fecha_cierre: Optional[datetime] = None
    responsable_cierre: Optional[EmpleadoResumen] = None

    model_config = ConfigDict(from_attributes=True)


class IncidenteDelete(BaseModel):
    id: int
    msg: str

    model_config = ConfigDict(from_attributes=True)
