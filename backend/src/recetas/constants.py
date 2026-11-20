from enum import Enum

class ErrorCode:
    RECETA_NO_ENCONTRADA = "La receta ingresada no fue encontrada"
    VERSION_INICIAL_REQUERIDA = "La receta necesita una version inicial para crearse"

    VERSION_NO_ENCONTRADA = "La version de receta ingresada no fue encontrada"
    RENDIMIENTO_FINAL_INVALIDO = "El rendimiento final de la version debe tener un valor mayor que cero"
    UNIDAD_VENTA_INVALIDA = "La unidad de venta de la version debe tener un valor mayor que cero"

    TIPO_USO_INVALIDO = "El tipo de uso especificado no es valido"

class EstadoVersionReceta(str, Enum):
    ACTIVO = "activo"
    ARCHIVADO = "archivado"

class TipoUsoInsumo(str, Enum):
    INGREDIENTE = "ingrediente"
    ADITIVO = "aditivo"


DECIMALES_ESCALADO = 2
DECIMALES_FACTOR = 4