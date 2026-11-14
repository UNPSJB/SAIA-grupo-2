from src.exceptions import NotFound
from src.unidades_medida.constants import ErrorCode


class UnidadMedidaNoEncontrada(NotFound):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_NO_ENCONTRADA
