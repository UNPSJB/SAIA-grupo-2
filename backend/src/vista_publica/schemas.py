from datetime import datetime
from typing import Annotated, List, Optional
from pydantic import BaseModel, ConfigDict, StringConstraints

from src.vista_publica.constants import LARGO_CONTACTO, LARGO_PRESENTACION, LARGO_TITULO_PUBLICO

TituloPublico = Annotated[str, StringConstraints(strip_whitespace=True, max_length=LARGO_TITULO_PUBLICO)]
Presentacion = Annotated[str, StringConstraints(strip_whitespace=True, max_length=LARGO_PRESENTACION)]
Contacto = Annotated[str, StringConstraints(strip_whitespace=True, max_length=LARGO_CONTACTO)]

class ConfiguracionVistaPublicaBase(BaseModel):
    nombre: str = "Vista Pública"
    activa: bool = False
    mostrar_cumplimiento_limpieza: bool = False
    mostrar_desglose_sectores: bool = False
    mostrar_equipos_calibrados: bool = False
    mostrar_capacitaciones: bool = False
    mostrar_poes_vigentes: bool = False
    mostrar_desglose_incidentes: bool = False
    mostrar_trazabilidad_lotes: bool = False
    titulo_publico: Optional[str] = None
    presentacion: Optional[str] = None
    contacto: Optional[str] = None

class ConfiguracionVistaPublicaCreate(BaseModel):
    nombre: Optional[str] = "Vista Pública"

class ConfiguracionVistaPublicaUpdate(BaseModel):
    nombre: Optional[str] = None
    activa: Optional[bool] = None
    mostrar_cumplimiento_limpieza: Optional[bool] = None
    mostrar_desglose_sectores: Optional[bool] = None
    mostrar_equipos_calibrados: Optional[bool] = None
    mostrar_capacitaciones: Optional[bool] = None
    mostrar_poes_vigentes: Optional[bool] = None
    mostrar_desglose_incidentes: Optional[bool] = None
    mostrar_trazabilidad_lotes: Optional[bool] = None
    titulo_publico: Optional[TituloPublico] = None
    presentacion: Optional[Presentacion] = None
    contacto: Optional[Contacto] = None

class ConfiguracionVistaPublicaResponse(ConfiguracionVistaPublicaBase):
    id: int
    fecha_activacion: Optional[datetime] = None
    token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ItemSeriePublica(BaseModel):
    periodo: str
    porcentaje: Optional[float] = None

class ItemDesgloseSector(BaseModel):
    sector: str
    porcentaje: float
    color: Optional[str] = None

class ItemDesgloseIncidente(BaseModel):
    etiqueta: str
    cantidad: int
    porcentaje: float
    color: Optional[str] = None

class VistaPublicaResumenResponse(BaseModel):
    activa: bool
    nombre: str = "Vista Pública"
    fecha_actualizacion: datetime
    mostrar_cumplimiento_limpieza: bool = False
    mostrar_desglose_sectores: bool = False
    mostrar_equipos_calibrados: bool = False
    mostrar_capacitaciones: bool = False
    mostrar_poes_vigentes: bool = False
    mostrar_desglose_incidentes: bool = False
    mostrar_trazabilidad_lotes: bool = False
    titulo_publico: Optional[str] = None
    presentacion: Optional[str] = None
    contacto: Optional[str] = None
    porcentaje_cumplimiento_limpieza: Optional[float] = None
    porcentaje_equipos_al_dia: Optional[float] = None
    porcentaje_personal_capacitado: Optional[float] = None
    porcentaje_libretas_sanitarias: Optional[float] = None
    porcentaje_capacitaciones_bpm: Optional[float] = None
    porcentaje_certificados_aptitud: Optional[float] = None
    porcentaje_poes_vigentes: Optional[float] = None
    porcentaje_lotes_trazables: Optional[float] = None
    lotes_totales_trazables: Optional[int] = None
    volumen_trazable_kg: Optional[float] = None
    desglose_sectores: List[ItemDesgloseSector] = []
    desglose_incidentes: List[ItemDesgloseIncidente] = []
    serie_cumplimiento: List[ItemSeriePublica] = []

    model_config = ConfigDict(from_attributes=True)
