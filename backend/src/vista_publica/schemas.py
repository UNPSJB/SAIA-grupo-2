from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class ConfiguracionVistaPublicaBase(BaseModel):
    activa: bool

class ConfiguracionVistaPublicaUpdate(ConfiguracionVistaPublicaBase):
    pass

class ConfiguracionVistaPublicaResponse(ConfiguracionVistaPublicaBase):
    id: int
    fecha_activacion: Optional[datetime] = None
    token: Optional[str] = None
    mostrar_cumplimiento_limpieza: bool = False
    mostrar_equipos_calibrados: bool = False
    mostrar_capacitaciones: bool = False

    model_config = ConfigDict(from_attributes=True)

class ItemSeriePublica(BaseModel):
    periodo: str
    porcentaje: Optional[float] = None

class VistaPublicaResumenResponse(BaseModel):
    activa: bool
    fecha_actualizacion: datetime
    porcentaje_cumplimiento_limpieza: Optional[float] = None
    porcentaje_equipos_al_dia: Optional[float] = None
    serie_cumplimiento: List[ItemSeriePublica] = []

    model_config = ConfigDict(from_attributes=True)
