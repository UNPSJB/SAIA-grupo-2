from src.recetas.constants import ErrorCode
from src.exceptions import NotFound, BadRequest, PermissionDenied

class PermisoDenegadoAdmin(PermissionDenied):
    DETAIL = "Acceso denegado: Se requiere rol de administrador"

class RecetaNoEncontrada(NotFound):
    DETAIL = ErrorCode.RECETA_NO_ENCONTRADA
class RecetaVigenteNoEncontrada(NotFound):
    DETAIL= ErrorCode.RECETA_VIGENTE_NO_ENCONTRADA
class VersionInicialRequerida(BadRequest):
    DETAIL = ErrorCode.VERSION_INICIAL_REQUERIDA

class VersionNoEncontrada(NotFound):
    DETAIL = ErrorCode.VERSION_NO_ENCONTRADA
class RendimientoFinalInvalido(BadRequest):
    DETAIL = ErrorCode.RENDIMIENTO_FINAL_INVALIDO
class UnidadVentaInvalida(BadRequest):
    DETAIL = ErrorCode.UNIDAD_VENTA_INVALIDA

class TipoUsoInvalido(BadRequest):
    DETAIL = ErrorCode.TIPO_USO_INVALIDO
class ParametrosEscaladoInvalidos(BadRequest):
    DETAIL = ErrorCode.PARAMETROS_ESCALADO_INVALIDOS
