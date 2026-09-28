from datetime import date
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

from src.equipos.schemas import EquipoResumen
from src.tareas.schemas import TareaResumen
from src.sectores.schemas import SectorResumen

TituloPlan = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class PlanBase(BaseModel):
    titulo: TituloPlan
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    sector_id: int

    @model_validator(mode="after")
    def validar_rango_de_fechas(self):
        if self.fecha_fin is not None and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de fin no puede ser anterior a la de inicio.")
        return self


class PlanCreate(PlanBase):
    equipos_ids: List[int]
    tareas_ids: List[int]


class PlanUpdate(PlanBase):
    equipos_ids: List[int]
    tareas_ids: List[int]


class Plan(PlanBase):
    id: int
    sector: SectorResumen
    equipos: List[EquipoResumen]
    tareas: List[TareaResumen]

    model_config = ConfigDict(from_attributes=True)

class PlanDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)
