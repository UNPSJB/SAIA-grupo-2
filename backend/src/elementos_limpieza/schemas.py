from datetime import date
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from src.elementos_limpieza.constants import EstadoRecambio

NombreElemento = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ElementoLimpiezaBase(BaseModel):
    nombre: NombreElemento
    frecuencia_recambio_dias: Optional[int] = Field(default=None, gt=0)


class ElementoLimpiezaCreate(ElementoLimpiezaBase):
    fecha_ultimo_recambio: Optional[date] = None


class ElementoLimpiezaUpdate(ElementoLimpiezaBase):
    fecha_ultimo_recambio: Optional[date] = None


class RecambioCreate(BaseModel):
    fecha_recambio: Optional[date] = None


class ElementoLimpieza(ElementoLimpiezaBase):
    id: int
    fecha_ultimo_recambio: date
    fecha_proximo_recambio: Optional[date]
    dias_restantes: Optional[int]
    estado_recambio: EstadoRecambio

    model_config = ConfigDict(from_attributes=True)


class ElementoLimpiezaDelete(BaseModel):
    id: int
    msg: str

    model_config = ConfigDict(from_attributes=True)
