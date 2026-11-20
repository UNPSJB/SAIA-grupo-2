from src.exceptions import BadRequest, NotFound
from src.parametros_normativos.constants import ErrorCode


class ConjuntoNoEncontrado(NotFound):
    DETAIL = ErrorCode.CONJUNTO_NO_ENCONTRADO


class SinParametrosVigentes(BadRequest):
    DETAIL = ErrorCode.SIN_PARAMETROS_VIGENTES


class ConjuntoPublicado(BadRequest):
    DETAIL = ErrorCode.CONJUNTO_PUBLICADO


class BorradorExistente(BadRequest):
    DETAIL = ErrorCode.BORRADOR_EXISTENTE


class DatoObligatorio(BadRequest):
    DETAIL = ErrorCode.DATO_OBLIGATORIO


class ValorInvalido(BadRequest):
    DETAIL = ErrorCode.VALOR_INVALIDO


class TextoVacio(BadRequest):
    DETAIL = ErrorCode.TEXTO_VACIO


class ElementoInexistente(BadRequest):
    DETAIL = ErrorCode.ELEMENTO_INEXISTENTE


class ModuloDesactivado(BadRequest):
    DETAIL = ErrorCode.MODULO_DESACTIVADO
