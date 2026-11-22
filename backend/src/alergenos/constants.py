from enum import Enum


class ErrorCode:
    SIN_DATOS_CONSERVACION = "Indicá al menos una condición de conservación: temperatura, duración o instrucciones."
    TEMPERATURAS_INVERTIDAS = "La temperatura mínima no puede ser mayor que la máxima."
    PERMISO_CONFIRMAR = "Solo una persona con permiso de administrar puede confirmar la declaración de alérgenos."


class Alergeno(str, Enum):
    """Alergenos y sustancias de declaracion obligatoria del articulo 235 septimo del CAA, en el orden del codigo."""

    TRIGO = "trigo"
    CENTENO = "centeno"
    CEBADA = "cebada"
    AVENA = "avena"
    CRUSTACEOS = "crustaceos"
    HUEVO = "huevo"
    PESCADO = "pescado"
    MANI = "mani"
    SOJA = "soja"
    LECHE = "leche"
    FRUTAS_SECAS = "frutas_secas"
    SULFITOS = "sulfitos"


NOMBRE_EN_ROTULO = {
    Alergeno.TRIGO: "TRIGO",
    Alergeno.CENTENO: "CENTENO",
    Alergeno.CEBADA: "CEBADA",
    Alergeno.AVENA: "AVENA",
    Alergeno.CRUSTACEOS: "CRUSTÁCEOS",
    Alergeno.HUEVO: "HUEVO",
    Alergeno.PESCADO: "PESCADO",
    Alergeno.MANI: "MANÍ",
    Alergeno.SOJA: "SOJA",
    Alergeno.LECHE: "LECHE",
    Alergeno.FRUTAS_SECAS: "FRUTAS SECAS",
    Alergeno.SULFITOS: "SULFITOS",
}


class EstadoDeclaracion(str, Enum):
    SUGERIDA = "sugerida"
    CONFIRMADA = "confirmada"


class UnidadDuracion(str, Enum):
    DIAS = "dias"
    MESES = "meses"


NOMBRE_UNIDAD_DURACION = {
    UnidadDuracion.DIAS: ("día", "días"),
    UnidadDuracion.MESES: ("mes", "meses"),
}
