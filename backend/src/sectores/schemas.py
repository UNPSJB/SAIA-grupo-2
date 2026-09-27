<<<<<<< HEAD
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from src.empleados.schemas import Empleado

TituloSector = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class SectorBase(BaseModel):
    titulo: TituloSector
    encargado_id: int


class SectorCreate(SectorBase):
    pass


class SectorUpdate(SectorBase):
    pass


class Sector(SectorBase):
    id: int
    encargado: Empleado

    model_config = ConfigDict(from_attributes=True)


class SectorResumen(BaseModel):
    id: int
    titulo: str

    model_config = ConfigDict(from_attributes=True)


class SectorDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)
=======
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
>>>>>>> origin/planes-rama
