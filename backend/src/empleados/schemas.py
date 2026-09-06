from pydantic import BaseModel, ConfigDict
from typing import List


class CapacidadRef(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class EmpleadoBase(BaseModel):
    nombre:str
    apellido:str

class EmpleadoCreate(EmpleadoBase):
    listaCapacidades: List[int] | None = None

class EmpleadoUpdate(EmpleadoBase):
    pass

class Empleado(EmpleadoBase):
    id: int
    capacidades: List[CapacidadRef]
    model_config = ConfigDict(from_attributes=True)