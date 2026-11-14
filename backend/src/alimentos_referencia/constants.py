from src.datos_nutricionales.constants import Nutriente


class ErrorCode:
    ALIMENTO_NO_ENCONTRADO = "El alimento de referencia no fue encontrado."


UNIDAD_CSV_MILILITROS = "mililitros"

COLUMNAS_CSV_SARA = {
    "E": Nutriente.ENERGIA,
    "HCdisp": Nutriente.CARBOHIDRATOS,
    "Prot": Nutriente.PROTEINAS,
    "Lip": Nutriente.GRASAS_TOTALES,
    "AGSat": Nutriente.GRASAS_SATURADAS,
    "Fibra": Nutriente.FIBRA_ALIMENTARIA,
    "Na": Nutriente.SODIO,
}

COLUMNAS_COMPLEMENTO_SARA2 = {
    "AzucaresTotales": Nutriente.AZUCARES_TOTALES,
    "AzucaresAnadidos": Nutriente.AZUCARES_ANADIDOS,
    "GrasasTrans": Nutriente.GRASAS_TRANS,
}

GRUPOS_EXCLUIDOS = ("S",)

DECIMALES = 2
LIMITE_BUSQUEDA = 20
LIMITE_BUSQUEDA_MAXIMO = 50
