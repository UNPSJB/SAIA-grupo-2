from enum import Enum
from pathlib import Path


class ErrorCode:
    CONJUNTO_NO_ENCONTRADO = "La versión de parámetros normativos no fue encontrada."
    SIN_PARAMETROS_VIGENTES = "No hay parámetros normativos vigentes: publicá una versión para poder evaluar."
    CONJUNTO_PUBLICADO = "La versión ya está publicada: es de solo lectura. Creá una nueva versión para cambiarla."
    BORRADOR_EXISTENTE = "Ya hay una versión en borrador: publicala o descartala antes de crear otra."
    DATO_OBLIGATORIO = "La norma de origen y la fecha de vigencia son obligatorias."
    VALOR_INVALIDO = "Los límites y factores deben ser mayores a 0."
    TEXTO_VACIO = "Los textos de los sellos y las excepciones no pueden quedar vacíos."
    ELEMENTO_INEXISTENTE = "Alguno de los valores indicados no pertenece a esta versión."
    MODULO_DESACTIVADO = "El módulo de rotulado frontal está desactivado."


class EstadoConjunto(str, Enum):
    BORRADOR = "borrador"
    PUBLICADO = "publicado"


class SelloAdvertencia(str, Enum):
    EXCESO_AZUCARES = "exceso_azucares"
    EXCESO_GRASAS_TOTALES = "exceso_grasas_totales"
    EXCESO_GRASAS_SATURADAS = "exceso_grasas_saturadas"
    EXCESO_SODIO = "exceso_sodio"
    EXCESO_CALORIAS = "exceso_calorias"
    CONTIENE_EDULCORANTES = "contiene_edulcorantes"
    CONTIENE_CAFEINA = "contiene_cafeina"


LEYENDAS_PRECAUTORIAS = (SelloAdvertencia.CONTIENE_EDULCORANTES, SelloAdvertencia.CONTIENE_CAFEINA)


class FormaCriterio(str, Enum):
    PORCENTAJE_ENERGIA = "porcentaje_energia"
    CANTIDAD_CADA_100 = "cantidad_cada_100"
    MG_POR_KCAL = "mg_por_kcal"


class CondicionCriterio(str, Enum):
    SIEMPRE = "siempre"
    CON_SELLO_DE_ENERGIA = "con_sello_de_energia"
    SIN_APORTE_ENERGETICO = "sin_aporte_energetico"


class Agregado(str, Enum):
    AZUCARES = "azucares"
    GRASAS = "grasas"
    SODIO = "sodio"
    EDULCORANTES = "edulcorantes"
    CAFEINA = "cafeina"


class ClaveParametro(str, Enum):
    KCAL_BEBIDA_SIN_APORTE_ENERGETICO = "kcal_bebida_sin_aporte_energetico"


ARCHIVO_PARAMETROS_INICIALES = Path(__file__).resolve().parents[2] / "data" / "parametros_rotulado_frontal_v1.json"
