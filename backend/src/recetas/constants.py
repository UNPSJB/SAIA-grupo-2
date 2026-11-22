from enum import Enum

class ErrorCode:
    RECETA_NO_ENCONTRADA = "La receta ingresada no fue encontrada"
    RECETA_VIGENTE_NO_ENCONTRADA = "El producto no tiene una receta vigente definida"
    VERSION_INICIAL_REQUERIDA = "La receta necesita una version inicial para crearse"

    VERSION_NO_ENCONTRADA = "La version de receta ingresada no fue encontrada"
    RENDIMIENTO_FINAL_INVALIDO = "El rendimiento final de la version debe tener un valor mayor que cero"
    UNIDAD_VENTA_INVALIDA = "La unidad de venta de la version debe tener un valor mayor que cero"

    TIPO_USO_INVALIDO = "El tipo de uso especificado no es valido"
    INSUMO_DUPLICADO = "No se permiten insumos repetidos en los renglones de la receta"
    INSUMO_INACTIVO = "No se puede utilizar un insumo dado de baja o inactivo"
    PRODUCTO_INACTIVO = "No se puede crear o modificar la receta de un producto dado de baja"
    ADITIVO_REQUERIDO = "Los renglones clasificados como aditivo deben especificar un aditivo de referencia válido"
    PARAMETROS_ESCALADO_INVALIDOS = "Debe indicar un factor multiplicador o una cantidad objetivo, pero no ambos"

class EstadoVersionReceta(str, Enum):
    ACTIVO = "activo"
    ARCHIVADO = "archivado"

class TipoUsoInsumo(str, Enum):
    INGREDIENTE = "ingrediente"
    ADITIVO = "aditivo"


DECIMALES_ESCALADO = 2
DECIMALES_FACTOR = 4

class FormatoDeclaracionAditivos(str, Enum):
    FUNCION_NOMBRE = "funcion_nombre"
    FUNCION_INS = "funcion_ins"
    FUNCION_AMBOS = "funcion_ambos"