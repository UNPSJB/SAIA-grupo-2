from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class ConfiguracionVistaPublicaBase(BaseModel):
    nombre: str = "Vista Pública"
    activa: bool = False
    mostrar_cumplimiento_limpieza: bool = False
    mostrar_equipos_calibrados: bool = False
    mostrar_capacitaciones: bool = False
    mostrar_poes_vigentes: bool = False
    mostrar_trazabilidad_lotes: bool = False

class ConfiguracionVistaPublicaCreate(BaseModel):
    nombre: Optional[str] = "Vista Pública"

class ConfiguracionVistaPublicaUpdate(BaseModel):
    nombre: Optional[str] = None
    activa: Optional[bool] = None
    mostrar_cumplimiento_limpieza: Optional[bool] = None
    mostrar_equipos_calibrados: Optional[bool] = None
    mostrar_capacitaciones: Optional[bool] = None
    mostrar_poes_vigentes: Optional[bool] = None
    mostrar_trazabilidad_lotes: Optional[bool] = None

class ConfiguracionVistaPublicaResponse(ConfiguracionVistaPublicaBase):
    id: int
    fecha_activacion: Optional[datetime] = None
    token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ItemSeriePublica(BaseModel):
    periodo: str
    porcentaje: Optional[float] = None

class VistaPublicaResumenResponse(BaseModel):
    activa: bool
    nombre: str = "Vista Pública"
    fecha_actualizacion: datetime
    mostrar_cumplimiento_limpieza: bool = False
    mostrar_equipos_calibrados: bool = False
    mostrar_capacitaciones: bool = False
    mostrar_poes_vigentes: bool = False
    mostrar_trazabilidad_lotes: bool = False
    porcentaje_cumplimiento_limpieza: Optional[float] = None
    porcentaje_equipos_al_dia: Optional[float] = None
    porcentaje_personal_capacitado: Optional[float] = None
    porcentaje_poes_vigentes: Optional[float] = None
    porcentaje_lotes_trazables: Optional[float] = None
    serie_cumplimiento: List[ItemSeriePublica] = []

    model_config = ConfigDict(from_attributes=True)
