from src.empleados.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class EmpleadoNoEncontrado(NotFound):
    DETAIL = ErrorCode.EMPLEADO_NO_ENCONTRADO

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO