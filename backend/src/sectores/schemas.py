from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class SectorBase(BaseModel):
    nombre: str
    responsable_id: Optional[int] = None

class SectorCreate(SectorBase):
    listaEmpleados: Optional[List[int]] = None

class SectorUpdate(SectorBase):
    listaEmpleados: Optional[List[int]] = None

class Sector(SectorBase):
    id: int
    model_config = ConfigDict(from_attributes=True)