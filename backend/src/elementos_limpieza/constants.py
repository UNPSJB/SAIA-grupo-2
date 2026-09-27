from enum import Enum

DIAS_AVISO_PREVIO = 10


class ErrorCode:
    ELEMENTO_NO_ENCONTRADO = "El elemento de limpieza no fue encontrado."
    ELEMENTO_EN_USO = "No se puede eliminar: el elemento tiene registros asociados."
    SIN_FRECUENCIA = "El elemento no tiene una frecuencia de recambio configurada."
    FECHA_FUTURA = "La fecha de recambio no puede ser posterior a hoy."


class EstadoRecambio(str, Enum):
    VENCIDO = "vencido"
    PROXIMO = "proximo"
    VIGENTE = "vigente"
    SIN_CONTROL = "sin_control"
