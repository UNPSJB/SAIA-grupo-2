from src.unidades_medida.constants import MagnitudUnidad


class ErrorCode:
    INSUMO_NO_ENCONTRADO = "El insumo no fue encontrado."
    NOMBRE_DUPLICADO = "El nombre del insumo ya existe."
    NOMBRE_VACIO = "El insumo debe tener un nombre."
    UNIDAD_NO_PERMITIDA = (
        "El insumo debe medirse en unidades de masa (g, kg), "
        "volumen (ml, l) o cantidad (unidades)."
    )
    CAMBIO_DE_MAGNITUD_CON_STOCK = (
        "No se puede cambiar la magnitud de un insumo que tiene stock cargado."
    )
    CANTIDAD_INVALIDA = "La cantidad debe ser mayor a 0."
    UNIDAD_INCOMPATIBLE = (
        "La unidad elegida no corresponde a la magnitud del insumo."
    )
    EQUIVALENCIA_INVALIDA = (
        "La equivalencia informada no corresponde a la magnitud del insumo."
    )

MAGNITUDES_INSUMO = (
    MagnitudUnidad.MASA,
    MagnitudUnidad.VOLUMEN,
    MagnitudUnidad.CANTIDAD,
)