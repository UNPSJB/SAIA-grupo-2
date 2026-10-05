from enum import Enum


class TipoDocumentacion(str, Enum):
    LIBRETA_SANITARIA = "libreta_sanitaria"
    CAPACITACION = "capacitacion"
    CERTIFICADO_APTITUD_FISICA = "certificado_aptitud_fisica"


class ErrorCode:
    DOCUMENTACION_NO_ENCONTRADA = "El documento no fue encontrado"
    NUMERO_CARNET_DUPLICADO = "Ya existe una libreta sanitaria con ese numero de carnet"
    TIPO_INVALIDO = "El tipo de documento indicado no es valido"
    CAMPOS_FALTANTES = "Faltan campos obligatorios para el tipo de documento indicado"


DIAS_AVISO_POR_DEFECTO = {
    TipoDocumentacion.LIBRETA_SANITARIA: 150,
    TipoDocumentacion.CAPACITACION: 30,
    TipoDocumentacion.CERTIFICADO_APTITUD_FISICA: 30,
}
