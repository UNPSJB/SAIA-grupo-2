from src.aditivos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest, PermissionDenied

class PermisoDenegadoAdmin(PermissionDenied):
    DETAIL = "Acceso denegado: Se requiere rol de administrador"

class ClaseFuncionalNoEncontrada(NotFound):
    DETAIL = ErrorCode.CLASE_FUNCIONAL_NO_ENCONTRADA
class ClaseFuncionalDuplicada(BadRequest):
    DETAIL = ErrorCode.CLASE_FUNCIONAL_DUPLICADA

class AditivoNoEncontrado(NotFound):
    DETAIL = ErrorCode.ADITIVO_NO_ENCONTRADO
class ClaseFuncionalRequerida(BadRequest):
    DETAIL = ErrorCode.CLASE_FUNCIONAL_REQUERIDA
class NombreRequerido(BadRequest):
    DETAIL = ErrorCode.NOMBRE_REQUERIDO
class NumeroINSDuplicado(BadRequest):
    DETAIL = ErrorCode.NUMERO_INS_DUPLICADO
class NumeroINSRequerido(BadRequest):
    DETAIL = ErrorCode.NUMERO_INS_REQUERIDO