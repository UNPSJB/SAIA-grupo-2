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

class RendimientoEnUnidadesRequerido(BadRequest):
    DETAIL = ErrorCode.RENDIMIENTO_EN_UNIDADES_REQUERIDO

class InsumoDuplicado(BadRequest):
    DETAIL = ErrorCode.INSUMO_DUPLICADO

class InsumoInactivo(BadRequest):
    DETAIL = ErrorCode.INSUMO_INACTIVO

class ProductoInactivo(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_INACTIVO

class AditivoRequerido(BadRequest):
    DETAIL = ErrorCode.ADITIVO_REQUERIDO

class CantidadOriginalInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_ORIGINAL_INVALIDA

class UnidadInsumoIncompatible(BadRequest):
    DETAIL = ErrorCode.UNIDAD_INSUMO_INCOMPATIBLE

class DensidadRequerida(BadRequest):
    DETAIL = ErrorCode.DENSIDAD_REQUERIDA

class PesoPorUnidadRequerido(BadRequest):
    DETAIL = ErrorCode.PESO_POR_UNIDAD_REQUERIDO

class EquivalenciaInvalida(BadRequest):
    DETAIL = ErrorCode.EQUIVALENCIA_INVALIDA


class RecetaExistente(BadRequest):
    DETAIL = ErrorCode.RECETA_EXISTENTE


class RecetaSinIngredientes(BadRequest):
    DETAIL = ErrorCode.RECETA_SIN_INGREDIENTES


class OrdenManualInvalido(BadRequest):
    DETAIL = ErrorCode.ORDEN_MANUAL_INVALIDO


class OrdenManualFueraDeEmpate(BadRequest):
    DETAIL = ErrorCode.ORDEN_MANUAL_FUERA_DE_EMPATE


class VersionSoloLectura(BadRequest):
    DETAIL = ErrorCode.VERSION_SOLO_LECTURA
