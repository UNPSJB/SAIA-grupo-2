from pydantic import BaseModel, ConfigDict
from typing import List

class CapacidadRef(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class EmpleadoBase(BaseModel):
    dni: str
    nombre: str
    apellido: str
    activo: bool = True

class EmpleadoCreate(EmpleadoBase):
    listaCapacidades: List[int] | None = None

class EmpleadoUpdate(EmpleadoBase):
    listaCapacidades: List[int] | None = None

class Empleado(EmpleadoBase):
    id: int
    legajo: str
    capacidades: List[CapacidadRef]
    model_config = ConfigDict(from_attributes=True)