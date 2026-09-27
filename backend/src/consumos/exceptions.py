from src.consumos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class ConsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.CONSUMO_NO_ENCONTRADO

class CantidadInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_INVALIDA