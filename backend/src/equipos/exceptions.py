from src.equipos.constants import ErrorCore
from src.exceptions import BadRequest, NotFound

class EquipoNoEncontrado(NotFound):
    DETAIL = ErrorCore.EQUIPO_NO_ENCONTRADO

