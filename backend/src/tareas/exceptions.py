from src.tareas.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class TareaNoEncontrada(NotFound):
    DETAIL = ErrorCode.TAREA_NO_ENCONTRADA


class TituloDuplicadoEnPlan(BadRequest):
    DETAIL = ErrorCode.TITULO_DUPLICADO_EN_PLAN


class CantidadInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_INVALIDA


class ProductoRepetido(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_REPETIDO


class SinStock(BadRequest):
    DETAIL = ErrorCode.SIN_STOCK

class SinPlanes(BadRequest):
    DETAIL = ErrorCode.SIN_PLANES

class TareaYaCompletada(BadRequest):
    DETAIL = ErrorCode.TAREA_YA_COMPLETADA