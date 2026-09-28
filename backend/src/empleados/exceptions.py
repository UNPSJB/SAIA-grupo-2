from src.empleados.constants import ErrorCode
from src.exceptions import NotFound, BadRequest, NotAuthenticated

class EmpleadoNoEncontrado(NotFound):
    DETAIL = ErrorCode.EMPLEADO_NO_ENCONTRADO

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class DniDuplicado(BadRequest):
    DETAIL = ErrorCode.DNI_DUPLICADO

class SectorRequerido(BadRequest):
    DETAIL = ErrorCode.SECTOR_REQUERIDO

class CredencialesInvalidas(NotAuthenticated):
    DETAIL = ErrorCode.CREDENCIALES_INVALIDAS
