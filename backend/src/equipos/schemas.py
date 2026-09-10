from pydantic import BaseModel, StringConstraints
from src.equipos.constants import TipoEquipo
from typing import Annotated

NombreEquipo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

class EquipoBase(BaseModel):
    nombre: NombreEquipo
    activo: bool
    tipo: TipoEquipo
    ubicacion: str
    
class EquipoCreate(EquipoBase):
    pass

class EquipoUpdate(EquipoBase):
    pass

class Equipo(EquipoBase):
    id: int
    

