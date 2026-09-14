from pydantic import BaseModel, ConfigDict

class UnidadMedidaBase(BaseModel):
    nombre: str

class UnidadMedidaCreate(UnidadMedidaBase):
    pass

class UnidadMedidaUpdate(UnidadMedidaBase):
    pass

class UnidadMedida(UnidadMedidaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)