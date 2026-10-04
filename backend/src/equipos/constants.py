from enum import Enum

DIAS_AVISO_PREVIO = 10

class ErrorCode:
    EQUIPO_NO_ENCONTRADO = "El equipo no fue encontrado"
    TIPO_EQUIPO_NO_ENCONTRADO = "El tipo de equipo no existe en el sistema"
    VENCIMIENTO_INVALIDO = "La fecha de vencimiento no puede ser anterior a hoy"

class TipoEquipo(str, Enum):
    HELADERA = "heladera"
    HORNO = "horno"
    BALANZA = "balanza"
    TERMOMETRO = "termometro"

class EstadoEquipo(str, Enum):
    BUENO = "bueno"
    DANADO = "danado"

class EstadoMantenimiento(str, Enum):
    VENCIDO = "vencido"
    PROXIMO = "proximo"
    VIGENTE = "vigente"
    SIN_CONTROL = "sin_control"