from src.productos_limpieza.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO


class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO


class ProductoEnUso(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_EN_USO


class StockNegativo(BadRequest):
    DETAIL = ErrorCode.STOCK_NEGATIVO
