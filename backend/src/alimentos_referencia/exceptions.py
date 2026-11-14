from src.alimentos_referencia.constants import ErrorCode
from src.exceptions import NotFound


class AlimentoNoEncontrado(NotFound):
    DETAIL = ErrorCode.ALIMENTO_NO_ENCONTRADO
