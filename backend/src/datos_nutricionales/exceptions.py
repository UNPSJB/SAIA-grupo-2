from src.datos_nutricionales.constants import ErrorCode
from src.exceptions import BadRequest


class ValorNegativo(BadRequest):
    DETAIL = ErrorCode.VALOR_NEGATIVO


class NutrienteRepetido(BadRequest):
    DETAIL = ErrorCode.NUTRIENTE_REPETIDO


class ReferenciaObligatoria(BadRequest):
    DETAIL = ErrorCode.REFERENCIA_OBLIGATORIA


class DatoNoInformado(BadRequest):
    DETAIL = ErrorCode.DATO_NO_INFORMADO
