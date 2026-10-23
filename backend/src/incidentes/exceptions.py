from src.exceptions import BadRequest, NotFound
from src.incidentes.constants import ErrorCode


class IncidenteNoEncontrado(NotFound):
    DETAIL = ErrorCode.INCIDENTE_NO_ENCONTRADO


class DescripcionRequerida(BadRequest):
    DETAIL = ErrorCode.DESCRIPCION_REQUERIDA


class EmpleadoRequerido(BadRequest):
    DETAIL = ErrorCode.EMPLEADO_REQUERIDO


class FotoYaCargada(BadRequest):
    DETAIL = ErrorCode.FOTO_YA_CARGADA


class FotoRequerida(BadRequest):
    DETAIL = ErrorCode.FOTO_REQUERIDA
