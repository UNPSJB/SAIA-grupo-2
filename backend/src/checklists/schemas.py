from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

# --- Envío de datos (Backend -> Frontend) para la lista diaria ---
class ChecklistItem(BaseModel):
    tarea_id: int
    titulo_tarea: str
    frecuencia: str
    plan_id: int
    plan_titulo: str
    sector_nombre: str
    estado: str

    model_config = ConfigDict(from_attributes=True)


# --- Recepción de datos (Frontend -> Backend) al completar tarea ---
class ConsumoRealCreate(BaseModel):
    producto_limpieza_id: int
    cantidad: float

class ChecklistMarcar(BaseModel):
    plan_id: Optional[int] = None
    empleado_id: int
    observaciones: Optional[str] = None
    evidencia_url: Optional[str] = None
    consumos: List[ConsumoRealCreate] = []


# --- Envío de datos (Backend -> Frontend) para el detalle y auditoría ---
class ConsumoRealResumen(BaseModel):
    id: int
    producto_limpieza_id: int
    nombre_producto: Optional[str] = None
    cantidad: float
    
    model_config = ConfigDict(from_attributes=True)

class RegistroChecklistDetalle(BaseModel):
    id: int
    tarea_id: int
    plan_id: Optional[int] = None
    fecha_programada: date
    realizada: bool
    fecha_hora_completada: Optional[datetime] = None
    empleado_id: Optional[int] = None
    nombre_empleado: Optional[str] = None
    titulo_tarea: Optional[str] = None
    plan_titulo: Optional[str] = None
    sector_nombre: Optional[str] = None
    evidencia_url: Optional[str] = None
    observaciones: Optional[str] = None
    consumos_reales: List[ConsumoRealResumen] = []
    
    model_config = ConfigDict(from_attributes=True)


# --- Envío de datos (Backend -> Frontend) para Historial ---
class TareaIncumplidaResumen(BaseModel):
    tarea_id: int
    titulo_tarea: str
    plan_titulo: str
    sector_nombre: str
    frecuencia: str
    veces_incumplida: int

    model_config = ConfigDict(from_attributes=True)


class RegistroHistorialItem(BaseModel):
    id: Optional[int] = None
    tarea_id: int
    titulo_tarea: str
    plan_id: Optional[int] = None
    plan_titulo: str
    sector_nombre: str
    frecuencia: str
    fecha_programada: date
    realizada: bool
    fecha_hora_completada: Optional[datetime] = None
    empleado_id: Optional[int] = None
    nombre_empleado: Optional[str] = None
    evidencia_url: Optional[str] = None
    observaciones: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class HistorialChecklistResumen(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    porcentaje_cumplimiento: float
    total_esperadas: int
    total_realizadas: int
    total_incumplidas: int
    tareas_incumplidas_resumen: List[TareaIncumplidaResumen] = []
    registros: List[RegistroHistorialItem] = []

    model_config = ConfigDict(from_attributes=True)
