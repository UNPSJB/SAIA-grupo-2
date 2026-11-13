from datetime import datetime
from typing import Optional
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

class VistaPublicaResumenResponse(BaseModel):
    activa: bool
    fecha_actualizacion: datetime
    porcentaje_cumplimiento_limpieza: Optional[float] = None
    porcentaje_equipos_al_dia: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)
