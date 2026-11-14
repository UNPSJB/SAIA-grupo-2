from pydantic import BaseModel, ConfigDict

from src.unidades_medida.schemas import UnidadMedida


class InsumoBase(BaseModel):
    nombre: str
    unidad_medida_id: int
    activo: bool = True


class InsumoCreate(InsumoBase):
    pass


class InsumoUpdate(InsumoBase):
    activo: bool = True


class Insumo(InsumoBase):
    id: int
    cantidad: float
    unidad_medida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)


class InsumoDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)


class InsumoAgregarStock(BaseModel):
    cantidad: float
    unidad_medida_id: int
