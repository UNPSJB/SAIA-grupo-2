from __future__ import annotations
from datetime import datetime
from typing import TYPE_CHECKING, Annotated, List, Optional
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from src.productos_limpieza.schemas import ProductoLimpiezaResumen
from src.tareas.constants import FrecuenciaTarea


TituloTarea = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

# He pasado por una penitencia de 3 horas, PlanResumen se queda aca.
class PlanResumen(BaseModel):
    id: int
    titulo: str

    model_config = ConfigDict(from_attributes=True)

class EmpleadoResumen(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)

class ConsumoEstimadoCreate(BaseModel):
    producto_limpieza_id: int
    cantidad: float = Field(gt=0)


class ConsumoEstimado(BaseModel):
    id: int
    cantidad: float
    producto_limpieza: ProductoLimpiezaResumen

    model_config = ConfigDict(from_attributes=True)


class TareaBase(BaseModel):
    titulo: TituloTarea
    frecuencia: FrecuenciaTarea


class TareaCreate(TareaBase):
    planes: List[int]
    consumos_estimados: List[ConsumoEstimadoCreate] = []


class TareaUpdate(TareaBase):
    planes: List[int]
    consumos_estimados: List[ConsumoEstimadoCreate] = []

class TareaResumen(TareaBase):
    id: int
    completada: bool
    completada_por_id: Optional[int] = None
    fecha_finalizacion: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class Tarea(TareaBase):
    id: int
    planes: List[PlanResumen]
    consumos_estimados: List[ConsumoEstimado]
    completada: bool
    completada_por_id: Optional[int] = None
    fecha_finalizacion: Optional[datetime] = None
    completada_por: Optional[EmpleadoResumen] = None
    model_config = ConfigDict(from_attributes=True)


class TareaDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)

class Autoria(BaseModel):
    empleado_id: int