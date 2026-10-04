from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from datetime import date
from src.equipos.constants import EstadoEquipo, EstadoMantenimiento

NombreEquipo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

class TipoEquipoBase(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class SectorRef(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class EquipoBase(BaseModel):
    nombre: NombreEquipo
    activo: bool
    sector_id: int 
    tipo_id: int 
    estado: EstadoEquipo = EstadoEquipo.BUENO
    frecuencia_mantenimiento_dias: Optional[int] = Field(default=None, gt=0)

class EquipoCreate(EquipoBase):
    frecuencia_mantenimiento_dias: int = Field(gt=0)
    fecha_vencimiento: Optional[date] = None

class EquipoUpdate(EquipoBase):
    pass

class MantenimientoCreate(BaseModel):
    fecha_mantenimiento: Optional[date] = None

class Equipo(EquipoBase):
    id: int
    tipo: TipoEquipoBase 
    sector: SectorRef
    fecha_ultimo_mantenimiento: date = Field(default=date.today())
    fecha_vencimiento: Optional[date]
    dias_restantes: Optional[int]
    estado_mantenimiento: EstadoMantenimiento

    model_config = ConfigDict(from_attributes=True)

class EquipoResumen(BaseModel):
    id: int
    nombre: str
    estado: EstadoEquipo
    model_config = ConfigDict(from_attributes=True)