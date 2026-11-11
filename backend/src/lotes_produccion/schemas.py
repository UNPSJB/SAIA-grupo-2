from datetime import date

from pydantic import BaseModel, ConfigDict

from src.productos.schemas import ProductoResumen


class LoteProduccionCreate(BaseModel):
    producto_id: int
    fecha: date
    cantidad: float


class LoteProduccion(BaseModel):
    nro_lote: int
    producto_id: int
    fecha: date
    cantidad: float
    producto: ProductoResumen

    model_config = ConfigDict(from_attributes=True)
