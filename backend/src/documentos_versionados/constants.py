from enum import Enum

class ErrorCode:
    DOCUMENTO_VERSIONADO_NO_ENCONTRADO = "El documento versionado no fue encontrado"
    DOCUMENTO_VERSIONADO_DUPLICADO = "Ya existe un documento de ese tipo con ese nombre"
    
    TIPO_REQUERIDO = "El documento versionado debe estar asociado a un tipo"
    TIPO_INVALIDO = "El tipo de documento versionado indicado no es valido"
    
    NOMBRE_REQUERIDO = "El documento versionado debe tener un nombre"
    
    ID_DOCUMENTO_VERSIONADO_REQUERIDO = "La version debe estar asociada a un documento versionado"
    VERSION_DOCUMENTO_FORMATO_INVALIDO="El documento debe ser una imagen o un archivo PDF"
    VERSION_DOCUMENTO_DEMASIADO_GRANDE="El documento no puede superar los 25 MB"

class TipoDocumentoVersionado(str, Enum):
    MANUAL_BPM = "manual_bpm"
    FICHA_TECNICA = "ficha_tecnica"
    PROCEDIMIENTO = "procedimiento"
    RECETA = "receta"