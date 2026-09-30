from src.documentacion.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class DocumentacionNoEncontrada(NotFound):
    DETAIL = ErrorCode.DOCUMENTACION_NO_ENCONTRADA


class NumeroCarnetDuplicado(BadRequest):
    DETAIL = ErrorCode.NUMERO_CARNET_DUPLICADO


class TipoInvalido(BadRequest):
    DETAIL = ErrorCode.TIPO_INVALIDO


class CamposFaltantes(BadRequest):
    DETAIL = ErrorCode.CAMPOS_FALTANTES
