from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from src.productos_limpieza.constants import TipoProductoLimpieza
from src.unidades_medida.schemas import UnidadMedida

NombreProducto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ProductoLimpiezaBase(BaseModel):
    nombre: NombreProducto
    tipo: TipoProductoLimpieza
    stock: float = Field(default=0, ge=0)
    unidad_medida_id: int


class ProductoLimpiezaCreate(ProductoLimpiezaBase):
    pass


class ProductoLimpiezaUpdate(ProductoLimpiezaBase):
    pass


class ProductoLimpieza(ProductoLimpiezaBase):
    id: int
    unidad_medida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)


class ProductoLimpiezaResumen(BaseModel):
    id: int
    nombre: str
    tipo: TipoProductoLimpieza

    model_config = ConfigDict(from_attributes=True)


class ProductoLimpiezaDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)
