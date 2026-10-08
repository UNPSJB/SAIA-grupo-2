from datetime import date

from pydantic import BaseModel, ConfigDict
from src.equipos.schemas import EquipoResumen

class CalibracionRealizadaBase(BaseModel):
    fecha: date
    equipo_id: int
    certificacion_url: str

class CalibracionRealizadaCreate(CalibracionRealizadaBase):
    pass

class CalibracionRealizada(CalibracionRealizadaBase):
    equipo: EquipoResumen
    model_config = ConfigDict(from_attributes=True)