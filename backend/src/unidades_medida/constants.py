from enum import Enum


class ErrorCode:
    UNIDAD_MEDIDA_NO_ENCONTRADA = "La unidad de medida no fue encontrada."


class MagnitudUnidad(str, Enum):
    MASA = "masa"
    VOLUMEN = "volumen"
    CANTIDAD = "cantidad"


DECIMALES_CANTIDAD = 2

CATALOGO_UNIDADES = (
    ("Gramos", MagnitudUnidad.MASA, 1.0),
    ("Kilogramos", MagnitudUnidad.MASA, 1000.0),
    ("Mililitros", MagnitudUnidad.VOLUMEN, 1.0),
    ("Litros", MagnitudUnidad.VOLUMEN, 1000.0),
    ("Unidades", MagnitudUnidad.CANTIDAD, 1.0),
)
