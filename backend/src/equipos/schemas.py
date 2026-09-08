from pydantic import BaseModel
from src.equipos.constants import TipoEquipo

class EquipoBase(BaseModel):
    nombre: str
    activo: bool
    tipo: TipoEquipo
    ubicacion: str
    
class EquipoCreate(EquipoBase):
    pass

class EquipoUpdate(EquipoBase):
    pass

class Equipo(EquipoBase):
    id: int
    

