from src.archivos.constants import ErrorCode
from src.exceptions import BadRequest


class ArchivoFormatoInvalido(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_FORMATO_INVALIDO


class ArchivoDemasiadoGrande(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_DEMASIADO_GRANDE
