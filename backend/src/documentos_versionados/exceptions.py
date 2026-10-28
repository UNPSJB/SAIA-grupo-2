from src.documentos_versionados.constants import ErrorCode
from src.exceptions import NotFound, BadRequest,PermissionDenied


class PermisoDenegadoAdmin(PermissionDenied):
    DETAIL = "Acceso denegado: Se requiere rol de administrador"

class DocumentoVersionadoNoEncontrado(NotFound):
    DETAIL = ErrorCode.DOCUMENTO_VERSIONADO_NO_ENCONTRADO
class DocumentoVersionadoDuplicado(BadRequest):
    DETAIL = ErrorCode.DOCUMENTO_VERSIONADO_DUPLICADO

class TipoRequerido(BadRequest):
    DETAIL = ErrorCode.TIPO_REQUERIDO
class TipoInvalido(BadRequest):
    DETAIL = ErrorCode.TIPO_INVALIDO

class NombreRequerido(BadRequest):
    DETAIL = ErrorCode.NOMBRE_REQUERIDO

class IdDocumentoVersionadoRequerido(BadRequest):
    DETAIL = ErrorCode.ID_DOCUMENTO_VERSIONADO_REQUERIDO
class VersionDocumentoFormatoInvalido(BadRequest):
    DETAIL = ErrorCode.VERSION_DOCUMENTO_FORMATO_INVALIDO
class VersionDocumentoDemasiadoGrande(BadRequest):
    DETAIL = ErrorCode.VERSION_DOCUMENTO_DEMASIADO_GRANDE

