from datetime import date
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict

from src.vencimientos.vencimientos import EstadoVencimiento


class CategoriaVencimiento(str, Enum):
    PERSONAL = "personal"
    DOCUMENTOS = "documentos"
    EQUIPOS = "equipos"
    CALIBRACION = "calibracion"


class ItemVencimientoConsolidado(BaseModel):
    id: str
    categoria: CategoriaVencimiento
    categoria_label: str
    titulo: str
    detalle: str
    referencia: Optional[str] = None
    fecha_vencimiento: date
    dias_restantes: int
    estado: EstadoVencimiento
    bloqueado: bool = False

    model_config = ConfigDict(from_attributes=True)


class ResumenVencimientos(BaseModel):
    total: int
    vencidos: int
    proximos: int
    vigentes: int
    items: list[ItemVencimientoConsolidado]

    model_config = ConfigDict(from_attributes=True)
