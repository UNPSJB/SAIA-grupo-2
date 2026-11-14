from typing import Optional

from pydantic import BaseModel, ConfigDict

from src.unidades_medida.constants import MagnitudUnidad


class AlimentoReferencia(BaseModel):
    codigo: str
    nombre: str
    magnitud: MagnitudUnidad
    nombre_en_pdf: Optional[str] = None
    energia: Optional[float] = None
    carbohidratos: Optional[float] = None
    azucares_totales: Optional[float] = None
    azucares_anadidos: Optional[float] = None
    proteinas: Optional[float] = None
    grasas_totales: Optional[float] = None
    grasas_saturadas: Optional[float] = None
    grasas_trans: Optional[float] = None
    fibra_alimentaria: Optional[float] = None
    sodio: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)
