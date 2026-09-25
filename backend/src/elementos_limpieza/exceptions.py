from src.elementos_limpieza.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class ElementoNoEncontrado(NotFound):
    DETAIL = ErrorCode.ELEMENTO_NO_ENCONTRADO


class ElementoEnUso(BadRequest):
    DETAIL = ErrorCode.ELEMENTO_EN_USO
