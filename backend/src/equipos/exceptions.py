from src.equipos.constants import ErrorCore
from src.exceptions import NotFound

class EquipoNoEncontrado(NotFound):
    DETAIL = ErrorCore.EQUIPO_NO_ENCONTRADO

class TipoEquipoNoEncontrado(NotFound):
    DETAIL = ErrorCore.TIPO_EQUIPO_NO_ENCONTRADO