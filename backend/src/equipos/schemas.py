from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from src.equipos.constants import EstadoEquipo, TipoEquipo

NombreEquipo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class EquipoBase(BaseModel):
    nombre: NombreEquipo
    activo: bool
    tipo: TipoEquipo
    ubicacion: str
    estado: EstadoEquipo = EstadoEquipo.BUENO


class EquipoCreate(EquipoBase):
    pass


class EquipoUpdate(EquipoBase):
    pass


class Equipo(EquipoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class EquipoResumen(BaseModel):
    id: int
    nombre: str
    estado: EstadoEquipo

    model_config = ConfigDict(from_attributes=True)
