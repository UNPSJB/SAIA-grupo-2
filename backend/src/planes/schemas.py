from datetime import date
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

from src.empleados.schemas import Empleado
from src.equipos.schemas import EquipoResumen
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
    equipos_ids: List[int] = []
    responsable_id: int


class PlanUpdate(PlanBase):
    equipos_ids: List[int] = []
    responsable_id: int


class AsignacionPlan(BaseModel):
    id: int
    empleado: Empleado
    fecha_asignacion: date
    fecha_fin: Optional[date]

    model_config = ConfigDict(from_attributes=True)


class Plan(PlanBase):
    id: int
    sector: SectorResumen
    equipos: List[EquipoResumen]
    responsable_actual: Optional[Empleado]
    asignaciones: List[AsignacionPlan]

    model_config = ConfigDict(from_attributes=True)


class PlanResumen(BaseModel):
    id: int
    titulo: str

    model_config = ConfigDict(from_attributes=True)


class PlanDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)
