from enum import Enum


class ErrorCode:
    PRODUCTO_NO_ENCONTRADO = "El producto no fue encontrado."
    NOMBRE_DUPLICADO = "Ya existe un producto con ese nombre."
    STOCK_NEGATIVO = "El stock no puede ser negativo."


class TipoProducto(str, Enum):
    ALIMENTO = "alimento"
    BEBIDA = "bebida"
