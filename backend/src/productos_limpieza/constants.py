from enum import Enum


class ErrorCode:
    PRODUCTO_NO_ENCONTRADO = "El producto de limpieza no fue encontrado."
    NOMBRE_DUPLICADO = "Ya existe un producto de limpieza con ese nombre."
    PRODUCTO_EN_USO = "No se puede eliminar: el producto esta asociado a una o mas tareas."
    STOCK_NEGATIVO = "El stock no puede ser negativo."


class TipoProductoLimpieza(str, Enum):
    DETERGENTE = "detergente"
    DESINFECTANTE = "desinfectante"
    DESENGRASANTE = "desengrasante"
    OTRO = "otro"
