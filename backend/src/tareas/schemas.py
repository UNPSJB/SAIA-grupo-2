from typing import Annotated, List

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from src.planes.schemas import PlanResumen
from src.productos_limpieza.schemas import ProductoLimpiezaResumen
from src.tareas.constants import FrecuenciaTarea

TituloTarea = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


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
    plan_id: int


class TareaCreate(TareaBase):
    consumos_estimados: List[ConsumoEstimadoCreate] = []


class TareaUpdate(TareaBase):
    consumos_estimados: List[ConsumoEstimadoCreate] = []


class Tarea(TareaBase):
    id: int
    plan: PlanResumen
    consumos_estimados: List[ConsumoEstimado]

    model_config = ConfigDict(from_attributes=True)


class TareaDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)
