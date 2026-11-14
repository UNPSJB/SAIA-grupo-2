from src.unidades_medida.constants import MagnitudUnidad


class ErrorCode:
    INSUMO_NO_ENCONTRADO = "El insumo no fue encontrado."
    NOMBRE_DUPLICADO = "El nombre del insumo ya existe."
    NOMBRE_VACIO = "El insumo debe tener un nombre."
    UNIDAD_NO_PERMITIDA = "El insumo debe medirse en unidades de masa (g, kg) o de volumen (ml, l)."
    CAMBIO_DE_MAGNITUD_CON_STOCK = "No se puede pasar de masa a volumen (o al revés) un insumo que tiene stock cargado."
    CANTIDAD_INVALIDA = "La cantidad debe ser mayor a 0."
    UNIDAD_INCOMPATIBLE = "La unidad elegida no corresponde a la del insumo (masa o volumen)."


MAGNITUDES_INSUMO = (MagnitudUnidad.MASA, MagnitudUnidad.VOLUMEN)
