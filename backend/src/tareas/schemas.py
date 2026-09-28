from __future__ import annotations
<<<<<<< HEAD
from datetime import datetime
from typing import TYPE_CHECKING, Annotated, List, Optional
=======
from typing import TYPE_CHECKING, Annotated, List
>>>>>>> merge-27-09
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from src.productos_limpieza.schemas import ProductoLimpiezaResumen
from src.tareas.constants import FrecuenciaTarea


TituloTarea = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

<<<<<<< HEAD
# He pasado por una penitencia de 3 horas, PlanResumen se queda aca.
=======
>>>>>>> merge-27-09
class PlanResumen(BaseModel):
    id: int
    titulo: str

    model_config = ConfigDict(from_attributes=True)

<<<<<<< HEAD
class EmpleadoResumen(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)

=======
>>>>>>> merge-27-09
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
<<<<<<< HEAD
    completada: bool
    completada_por_id: Optional[int] = None
    fecha_finalizacion: Optional[datetime] = None
=======
>>>>>>> merge-27-09
    model_config = ConfigDict(from_attributes=True)

class Tarea(TareaBase):
    id: int
    planes: List[PlanResumen]
    consumos_estimados: List[ConsumoEstimado]
<<<<<<< HEAD
    completada: bool
    completada_por_id: Optional[int] = None
    fecha_finalizacion: Optional[datetime] = None
    completada_por: Optional[EmpleadoResumen] = None
=======
>>>>>>> merge-27-09
    model_config = ConfigDict(from_attributes=True)


class TareaDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)
<<<<<<< HEAD

class Autoria(BaseModel):
    empleado_id: int
=======
>>>>>>> merge-27-09
