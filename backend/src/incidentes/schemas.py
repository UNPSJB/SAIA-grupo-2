from datetime import datetime, timezone
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

from src.incidentes.constants import (
    LARGO_MAXIMO_DESCRIPCION,
    EstadoIncidente,
    TipoIncidente,
    TipoMovimiento,
)

Descripcion = Annotated[
    str,
    Field(min_length=3, max_length=LARGO_MAXIMO_DESCRIPCION, strip_whitespace=True),
]
NombreArchivo = Annotated[str, Field(max_length=200, strip_whitespace=True)]


def _en_utc(valor: datetime) -> str:
    """SQLite descarta la zona al guardar; los instantes de incidentes se registran en UTC."""
    if valor.tzinfo is None:
        valor = valor.replace(tzinfo=timezone.utc)
    return valor.isoformat()


FechaUTC = Annotated[datetime, PlainSerializer(_en_utc, return_type=str)]


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


class CierreIncidente(BaseModel):
    """Accion correctiva tomada y quien la resuelve."""

    accion_correctiva: Descripcion
    responsable_id: int


class ReaperturaIncidente(BaseModel):
    """Motivo por el que se vuelve a abrir y quien lo reabre."""

    motivo: Descripcion
    responsable_id: int


class MovimientoIncidente(BaseModel):
    id: int
    tipo: TipoMovimiento
    descripcion: str
    fecha_hora: FechaUTC
    empleado: EmpleadoResumen

    model_config = ConfigDict(from_attributes=True)


class FotoIncidente(BaseModel):
    """Unica modificacion permitida: adjuntar la foto que no se cargo al registrar."""

    archivo_url: str
    archivo_nombre: Optional[NombreArchivo] = None


class Incidente(BaseModel):
    id: int
    descripcion: str
    tipo: TipoIncidente
    estado: EstadoIncidente
    fecha_hora_reporte: FechaUTC
    empleado: EmpleadoResumen
    archivo_url: Optional[str] = None
    archivo_nombre: Optional[str] = None
    dias_abierto: Optional[int] = None

    accion_correctiva: Optional[str] = None
    fecha_cierre: Optional[FechaUTC] = None
    responsable_cierre: Optional[EmpleadoResumen] = None
    movimientos: list[MovimientoIncidente] = []

    model_config = ConfigDict(from_attributes=True)


class ConteoPorTipo(BaseModel):
    tipo: TipoIncidente
    cantidad: int


class ResumenIncidentes(BaseModel):
    """Base del indicador de incidentes por tipo del tablero (E7)."""

    abiertos: int
    cerrados: int
    total: int
    abiertos_por_tipo: list[ConteoPorTipo]


class IncidenteDelete(BaseModel):
    id: int
    msg: str

    model_config = ConfigDict(from_attributes=True)


class EstadisticaIncidente(BaseModel):
    tipo: TipoIncidente
    cantidad: int
