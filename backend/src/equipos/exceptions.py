from src.equipos.constants import ErrorCode
from src.exceptions import BadRequest, NotFound

class EquipoNoEncontrado(NotFound):
    DETAIL = ErrorCode.EQUIPO_NO_ENCONTRADO

class TipoEquipoNoEncontrado(NotFound):
    DETAIL = ErrorCode.TIPO_EQUIPO_NO_ENCONTRADO

class VencimientoInvalido(BadRequest):
    DETAIL = ErrorCode.VENCIMIENTO_INVALIDO