from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from src.productos.constants import TipoProducto
from src.unidades_medida.schemas import UnidadMedida

NombreProducto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class ProductoBase(BaseModel):
    nombre: NombreProducto
    tipo: TipoProducto
    stock: float = 0
    unidad_medida_id: int


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(ProductoBase):
    pass


class Producto(ProductoBase):
    id: int
    unidad_medida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)


class ProductoResumen(BaseModel):
    """Datos minimos del producto para mostrarlo dentro de un lote."""

    id: int
    nombre: str
    tipo: TipoProducto
    unidad_medida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)


class ProduccionPorProducto(BaseModel):
    producto_id: int
    producto: str
    unidad_medida: UnidadMedida
    cantidad: float


class EvolucionProduccion(BaseModel):
    fecha: date
    producto_id: int
    producto: str
    unidad_medida: UnidadMedida
    cantidad: float
    

class EstadisticasProduccion(BaseModel):
    totales_por_producto: list[ProduccionPorProducto]
    evolucion_por_producto: list[EvolucionProduccion]