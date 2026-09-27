from typing import Annotated
from pydantic import BaseModel, ConfigDict, StringConstraints

from src.equipos.constants import EstadoEquipo

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

class EquipoCreate(EquipoBase):
    pass

class EquipoUpdate(EquipoBase):
    pass

class Equipo(EquipoBase):
    id: int
    tipo: TipoEquipoBase 
    sector: SectorRef
    model_config = ConfigDict(from_attributes=True)

class EquipoResumen(BaseModel):
    id: int
    nombre: str
    estado: EstadoEquipo
    model_config = ConfigDict(from_attributes=True)