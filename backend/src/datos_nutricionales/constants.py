from enum import Enum


class Nutriente(str, Enum):
    """Valor energetico y nutrientes de declaracion obligatoria, cada 100 g (o 100 ml si el insumo es liquido)."""

    ENERGIA = "energia"
    CARBOHIDRATOS = "carbohidratos"
    AZUCARES_TOTALES = "azucares_totales"
    AZUCARES_ANADIDOS = "azucares_anadidos"
    PROTEINAS = "proteinas"
    GRASAS_TOTALES = "grasas_totales"
    GRASAS_SATURADAS = "grasas_saturadas"
    GRASAS_TRANS = "grasas_trans"
    FIBRA_ALIMENTARIA = "fibra_alimentaria"
    SODIO = "sodio"


class FuenteDatoNutricional(str, Enum):
    SARA = "sara"
    ROTULO_PROVEEDOR = "rotulo_proveedor"
    BIBLIOGRAFIA = "bibliografia"
    VALOR_PROPIO = "valor_propio"


UNIDAD_NUTRIENTE = {
    Nutriente.ENERGIA: "kcal",
    Nutriente.SODIO: "mg",
}
UNIDAD_POR_DEFECTO = "g"

TOLERANCIA_MODIFICACION = 0.005


class ErrorCode:
    VALOR_NEGATIVO = "Los valores nutricionales no pueden ser negativos."
    NUTRIENTE_REPETIDO = "Cada nutriente se puede cargar una sola vez por operación."
    REFERENCIA_OBLIGATORIA = "Para la fuente SARA hay que indicar el alimento de referencia."
    DATO_NO_INFORMADO = "El alimento de referencia no informa uno de los nutrientes indicados."
