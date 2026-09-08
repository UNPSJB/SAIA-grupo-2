from enum import Enum

class ErrorCore:
    EQUIPO_NO_ENCONTRADO = "El equipo no fue encontrado"
    
class TipoEquipo(str, Enum):
    HELADERA = "heladera"
    HORNO = "horno"
    BALANZA = "balanza"
    TERMOMETRO = "termometro"