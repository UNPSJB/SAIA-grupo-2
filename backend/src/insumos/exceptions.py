from src.exceptions import BadRequest, NotFound
from src.insumos.constants import ErrorCode


class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO


class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO


class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO


class UnidadNoPermitida(BadRequest):
    DETAIL = ErrorCode.UNIDAD_NO_PERMITIDA


class CambioDeMagnitudConStock(BadRequest):
    DETAIL = ErrorCode.CAMBIO_DE_MAGNITUD_CON_STOCK


class CantidadInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_INVALIDA


class UnidadIncompatible(BadRequest):
    DETAIL = ErrorCode.UNIDAD_INCOMPATIBLE
