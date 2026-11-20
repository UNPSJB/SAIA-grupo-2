from enum import Enum


class ErrorCode:
    EXCEPCION_INVALIDA = "La excepción indicada no figura en los parámetros normativos vigentes."


class ResultadoAplicabilidad(str, Enum):
    NO_ENVASADO = "no_envasado"
    EXCEPTUADO = "exceptuado"
    SIN_AGREGADOS = "sin_agregados"
    CORRESPONDE = "corresponde"
