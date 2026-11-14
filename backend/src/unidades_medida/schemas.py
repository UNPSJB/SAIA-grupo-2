from pydantic import BaseModel, ConfigDict

from src.unidades_medida.constants import MagnitudUnidad


class UnidadMedida(BaseModel):
    id: int
    nombre: str
    magnitud: MagnitudUnidad
    factor_base: float

    model_config = ConfigDict(from_attributes=True)
