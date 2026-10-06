from src.calibracion_realizada.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class FechaRequerida(BadRequest):
    DETAIL = ErrorCode.FECHA_REQUERIDA
class FechaInvalida(BadRequest):
    DETAIL = ErrorCode.FECHA_INVALIDA
class FechaMayorAHoy(BadRequest):
    DETAIL = ErrorCode.FECHA_MAYOR_A_HOY

class EquipoRequerido(BadRequest):
    DETAIL = ErrorCode.EQUIPO_REQUERIDO
class EquipoNoEncontrado(NotFound):
    DETAIL = ErrorCode.EQUIPO_NO_ENCONTRADO

class CertificacionRequerida(BadRequest):
    DETAIL = ErrorCode.CERTIFICACION_REQUERIDA

class CalibracionDuplicada(BadRequest):
    DETAIL = ErrorCode.CALIBRACION_DUPLICADA