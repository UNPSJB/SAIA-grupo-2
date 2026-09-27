from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from src.empleados.models import RolEmpleado

class CapacidadRef(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class SectorRef(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class EmpleadoBase(BaseModel):
    dni: str
    nombre: str
    apellido: str
    activo: bool = True
    rol: RolEmpleado = RolEmpleado.OPERARIO

class EmpleadoCreate(EmpleadoBase):
    listaCapacidades: List[int] | None = None
    listaSectores: List[int] | None = None 

class EmpleadoUpdate(EmpleadoBase):
    listaCapacidades: List[int] | None = None
    listaSectores: List[int] | None = None 

class Empleado(EmpleadoBase):
    id: int
    legajo: str
    capacidades: List[CapacidadRef]
    sectores: List[SectorRef] = [] 
    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    legajo: str
    dni: str

class LoginResponse(BaseModel):
    empleado: Empleado
    mensaje: str