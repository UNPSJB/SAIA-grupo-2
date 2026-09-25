from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

NombreElemento = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ElementoLimpiezaBase(BaseModel):
    nombre: NombreElemento
    frecuencia_recambio_dias: Optional[int] = Field(default=None, gt=0)


class ElementoLimpiezaCreate(ElementoLimpiezaBase):
    pass


class ElementoLimpiezaUpdate(ElementoLimpiezaBase):
    pass


class ElementoLimpieza(ElementoLimpiezaBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ElementoLimpiezaDelete(BaseModel):
    id: int
    msg: str

    model_config = ConfigDict(from_attributes=True)
