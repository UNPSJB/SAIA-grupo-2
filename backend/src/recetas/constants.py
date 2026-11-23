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
    CANTIDAD_ORIGINAL_INVALIDA = "La cantidad original de cada insumo debe ser mayor que cero"
    UNIDAD_INSUMO_INCOMPATIBLE = "La unidad seleccionada no corresponde a la magnitud del insumo"
    DENSIDAD_REQUERIDA = "El insumo de volumen debe tener una densidad en gramos por mililitro configurada"
    PESO_POR_UNIDAD_REQUERIDO = "El insumo por unidad debe tener configurado su peso en gramos por unidad"
    EQUIVALENCIA_INVALIDA = "No se pudo convertir la cantidad del insumo a gramos"
    RECETA_EXISTENTE = "El producto ya tiene una receta: los cambios se hacen creando una nueva versión"
    RECETA_SIN_INGREDIENTES = "La receta debe tener al menos un ingrediente"
    ORDEN_MANUAL_INVALIDO = "El orden manual debe incluir a todos los ingredientes una sola vez"
    ORDEN_MANUAL_FUERA_DE_EMPATE = "Solo se puede cambiar el orden entre ingredientes con el mismo porcentaje"
    VERSION_SOLO_LECTURA = "Las versiones anteriores de la receta son de solo lectura"
    PARAMETROS_ESCALADO_INVALIDOS = "Indicá uno solo: factor multiplicador, cantidad objetivo en gramos o cantidad de unidades"

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