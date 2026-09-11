from src.unidades_medida.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class UnidadMedidaNoEncontrada(NotFound):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_NO_ENCONTRADA

class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO

class UnidadMedidaDuplicada(BadRequest):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_DUPLICADA