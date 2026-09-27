from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from src.empleados.schemas import Empleado

TituloSector = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class SectorBase(BaseModel):
    titulo: TituloSector
    encargado_id: int


class SectorCreate(SectorBase):
    pass


class SectorUpdate(SectorBase):
    pass


class Sector(SectorBase):
    id: int
    encargado: Empleado

    model_config = ConfigDict(from_attributes=True)


class SectorResumen(BaseModel):
    id: int
    titulo: str

    model_config = ConfigDict(from_attributes=True)


class SectorDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)
