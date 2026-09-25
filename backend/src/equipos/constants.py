from enum import Enum

class ErrorCore:
    EQUIPO_NO_ENCONTRADO = "El equipo no fue encontrado"
    TIPO_EQUIPO_NO_ENCONTRADO = "El tipo de equipo no existe en el sistema"

class TipoEquipo(str, Enum):
    HELADERA = "heladera"
    HORNO = "horno"
    BALANZA = "balanza"
    TERMOMETRO = "termometro"

class EstadoEquipo(str, Enum):
    BUENO = "bueno"
    DANADO = "danado"