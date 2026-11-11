from src.exceptions import BadRequest, NotFound
from src.productos.constants import ErrorCode


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO


class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO


class StockNegativo(BadRequest):
    DETAIL = ErrorCode.STOCK_NEGATIVO
