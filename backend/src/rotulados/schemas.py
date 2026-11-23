
from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# Datos comunes del rótulo
class RotuloDatos(BaseModel):
    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[float] = Field(default=None, gt=0)
    unidad_contenido_neto: Optional[str] = None
    rnpa_rppa: Optional[str] = None

    razon_social: Optional[str] = None
    domicilio: Optional[str] = None

    es_importado: bool = False
    razon_social_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    pais_origen: Optional[str] = None

    instrucciones_uso: Optional[str] = None
    instrucciones_conservacion: Optional[str] = None


# Creación del borrador
class RotuloCrear(RotuloDatos):
    producto_id: int


# Actualización de datos del rótulo
class RotuloActualizar(BaseModel):
    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[float] = Field(default=None, gt=0)
    unidad_contenido_neto: Optional[str] = None
    rnpa_rppa: Optional[str] = None

    razon_social: Optional[str] = None
    domicilio: Optional[str] = None

    es_importado: Optional[bool] = None
    razon_social_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    pais_origen: Optional[str] = None

    instrucciones_uso: Optional[str] = None
    instrucciones_conservacion: Optional[str] = None


# Respuesta del rótulo
class RotuloRespuesta(RotuloDatos):
    model_config = ConfigDict(from_attributes=True)

    id: int
    producto_id: int

    ingredientes_snapshot: Optional[dict[str, Any]] = None
    nutricion_snapshot: Optional[dict[str, Any]] = None
    sellos_snapshot: Optional[list[str]] = None

    receta_id: Optional[int] = None
    receta_version: Optional[int] = None

    fecha_creacion: datetime
    fecha_actualizacion: datetime


# Asociación del rótulo con un lote
class RotuloLoteCrear(BaseModel):
    nro_lote: int
    fecha_duracion: Optional[date] = None


class RotuloLoteActualizar(BaseModel):
    fecha_duracion: Optional[date] = None


class RotuloLoteRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rotulo_id: int
    nro_lote: int
    fecha_duracion: Optional[date] = None
    fecha_creacion: datetime


# Historial de modificaciones
class HistorialCambioRotuloRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rotulo_id: int
    campo: str
    valor_original: Optional[str] = None
    valor_nuevo: Optional[str] = None
    empleado_id: Optional[int] = None
    empleado_nombre: Optional[str] = None
    empleado_apellido: Optional[str] = None
    fecha_cambio: datetime