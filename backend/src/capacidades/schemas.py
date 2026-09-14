from pydantic import BaseModel, ConfigDict, field_validator
from typing import List


class EmpleadoRef(BaseModel):
    id: int
    nombre: str
    apellido: str
    model_config = ConfigDict(from_attributes=True)

class CapacidadBase(BaseModel):
    nombre:str

    @field_validator("nombre")
    @classmethod
    def convertirAMinusculas(cls, valor:str) -> str:
        return valor.strip().lower()

class CapacidadCreate(CapacidadBase):
    pass

class CapacidadUpdate(CapacidadBase):
    pass

class Capacidad(CapacidadBase):
    id: int
    empleados: List[EmpleadoRef]
    model_config = ConfigDict(from_attributes=True)
    