from src.capacidades.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class CapacidadNoEncontrada(NotFound):
    DETAIL = ErrorCode.CAPACIDAD_NO_ENCONTRADA

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO