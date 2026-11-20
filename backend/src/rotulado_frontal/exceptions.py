from src.exceptions import BadRequest
from src.rotulado_frontal.constants import ErrorCode


class ExcepcionInvalida(BadRequest):
    DETAIL = ErrorCode.EXCEPCION_INVALIDA
