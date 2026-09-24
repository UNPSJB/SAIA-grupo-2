from pydantic import BaseModel, StringConstraints, ConfigDict
from typing import Annotated

NombreEquipo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

class TipoEquipoBase(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class EquipoBase(BaseModel):
    nombre: NombreEquipo
    activo: bool
    ubicacion: str
    tipo_id: int 
    
class EquipoCreate(EquipoBase):
    pass

class EquipoUpdate(EquipoBase):
    pass

class Equipo(EquipoBase):
    id: int
    tipo: TipoEquipoBase 
    model_config = ConfigDict(from_attributes=True)