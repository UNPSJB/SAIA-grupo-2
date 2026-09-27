from src.sectores.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

<<<<<<< HEAD

class SectorNoEncontrado(NotFound):
    DETAIL = ErrorCode.SECTOR_NO_ENCONTRADO


class TituloDuplicado(BadRequest):
    DETAIL = ErrorCode.TITULO_DUPLICADO


class SectorEnUso(BadRequest):
    DETAIL = ErrorCode.SECTOR_EN_USO
=======
class SectorNoEncontrado(NotFound):
    DETAIL = ErrorCode.SECTOR_NO_ENCONTRADO

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class SectorEnUso(BadRequest):
    DETAIL = ErrorCode.SECTOR_EN_USO
>>>>>>> origin/planes-rama
