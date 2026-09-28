from typing import Annotated, List, Optional
from pydantic import BaseModel, ConfigDict, StringConstraints

NombreSector = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

class EmpleadoRef(BaseModel):
    id: int
    nombre: str
    apellido: str
    legajo: str
    model_config = ConfigDict(from_attributes=True)

class EquipoRef(BaseModel):
    id: int
    nombre: str
    activo: bool
    model_config = ConfigDict(from_attributes=True)

class SectorBase(BaseModel):
    nombre: NombreSector
    responsable_id: Optional[int] = None

class SectorCreate(SectorBase):
    listaEmpleados: Optional[List[int]] = None

class SectorUpdate(SectorBase):
    listaEmpleados: Optional[List[int]] = None

class Sector(SectorBase):
    id: int
    responsable: Optional[EmpleadoRef] = None
    empleados: List[EmpleadoRef] = []
    equipos: List[EquipoRef] = []
    
    model_config = ConfigDict(from_attributes=True)

class SectorResumen(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)