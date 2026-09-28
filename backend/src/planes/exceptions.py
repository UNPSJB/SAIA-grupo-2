from src.planes.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class PlanNoEncontrado(NotFound):
    DETAIL = ErrorCode.PLAN_NO_ENCONTRADO


class TituloDuplicado(BadRequest):
    DETAIL = ErrorCode.TITULO_DUPLICADO


class FechasInvalidas(BadRequest):
    DETAIL = ErrorCode.FECHAS_INVALIDAS


class EquipoDanado(BadRequest):
    DETAIL = ErrorCode.EQUIPO_DANADO


class SinEquipos(BadRequest):
    DETAIL = ErrorCode.SIN_EQUIPOS


class PlanConTareas(BadRequest):
    DETAIL = ErrorCode.PLAN_CON_TAREAS

class SinTareas(BadRequest):
    DETAIL = ErrorCode.SIN_TAREAS
