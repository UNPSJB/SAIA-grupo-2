from enum import Enum


class TipoIncidente(str, Enum):
    ROTURA = "rotura"
    PLAGA = "plaga"
    DEVOLUCION_CLIENTE = "devolucion_cliente"
    OTRO = "otro"


class EstadoIncidente(str, Enum):
    ABIERTO = "abierto"
    CERRADO = "cerrado"


class ErrorCode:
    INCIDENTE_NO_ENCONTRADO = "El incidente no fue encontrado"
    DESCRIPCION_REQUERIDA = "El incidente debe tener una descripcion"
    EMPLEADO_REQUERIDO = "El incidente debe indicar quien lo reporta"
    FOTO_YA_CARGADA = "El incidente ya tiene una foto y no se puede reemplazar"
    FOTO_REQUERIDA = "Debe indicar la foto a adjuntar"


LARGO_MAXIMO_DESCRIPCION = 1000

DIAS_PARA_DESTACAR_ANTIGUEDAD = 15
