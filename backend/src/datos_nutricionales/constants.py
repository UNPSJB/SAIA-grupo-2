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


class EstadoTablaNutricional(str, Enum):
    COMPLETA = "completa"
    INCOMPLETA = "incompleta"


NUTRIENTES_TABLA_NORMATIVA = [
    {"nutriente": Nutriente.ENERGIA, "nombre": "Valor energético", "subnivel": False, "obligatorio": True, "valor_diario": 2000.0},
    {"nutriente": Nutriente.CARBOHIDRATOS, "nombre": "Carbohidratos", "subnivel": False, "obligatorio": True, "valor_diario": 300.0},
    {"nutriente": Nutriente.AZUCARES_TOTALES, "nombre": "Azúcares totales", "subnivel": True, "obligatorio": True, "valor_diario": None},
    {"nutriente": Nutriente.AZUCARES_ANADIDOS, "nombre": "Azúcares añadidos", "subnivel": True, "obligatorio": True, "valor_diario": None},
    {"nutriente": Nutriente.PROTEINAS, "nombre": "Proteínas", "subnivel": False, "obligatorio": True, "valor_diario": 75.0},
    {"nutriente": Nutriente.GRASAS_TOTALES, "nombre": "Grasas totales", "subnivel": False, "obligatorio": True, "valor_diario": 55.0},
    {"nutriente": Nutriente.GRASAS_SATURADAS, "nombre": "Grasas saturadas", "subnivel": True, "obligatorio": True, "valor_diario": 22.0},
    {"nutriente": Nutriente.GRASAS_TRANS, "nombre": "Grasas trans", "subnivel": True, "obligatorio": True, "valor_diario": None},
    {"nutriente": Nutriente.FIBRA_ALIMENTARIA, "nombre": "Fibra alimentaria", "subnivel": False, "obligatorio": True, "valor_diario": 25.0},
    {"nutriente": Nutriente.SODIO, "nombre": "Sodio", "subnivel": False, "obligatorio": True, "valor_diario": 2400.0},
]

LEYENDA_TABLA_NUTRICIONAL = (
    "Valores calculados a partir de datos de referencia. Deben ser revisados por un/a "
    "profesional competente antes de usarse en el rótulo."
)

NOTA_PIE_VALORES_DIARIOS = (
    "(*) % Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ. "
    "Sus valores diarios pueden ser mayores o menores dependiendo de sus necesidades energéticas."
)