from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional
from src.documentos_versionados.constants import TipoDocumentoVersionado
from src.asociaciones.version_documento import EstadoVersionDocumento


class EmpleadoResumen(BaseModel):
    id: int
    legajo: str
    nombre: str
    apellido: str
    model_config = ConfigDict(from_attributes=True)


# --- Versiones de Documento ---

class VersionDocumentoBase(BaseModel):
    version_documento_url: str
    archivo_nombre: Optional[str] = None
    fecha_vigencia: Optional[date] = None


class VersionDocumentoCreate(VersionDocumentoBase):
    # Opcional en el body si se toma desde la URL de la ruta
    documentos_versionados_id: Optional[int] = None
    subido_por_id: Optional[int] = None


class VersionDocumento(VersionDocumentoBase):
    documentos_versionados_id: int
    version: int
    estado: EstadoVersionDocumento  
    fecha_subida: Optional[datetime] = None
    fecha_modificacion: Optional[datetime] = None  
    subido_por_id: Optional[int] = None
    subido_por: Optional[EmpleadoResumen] = None
    modificado_por_id: Optional[int] = None        
    modificado_por: Optional[EmpleadoResumen] = None
    model_config = ConfigDict(from_attributes=True)


# --- Documentos Versionados ---

class DocumentoVersionadoBase(BaseModel):
    nombre: str
    tipo: TipoDocumentoVersionado


class DocumentoVersionadoCreate(DocumentoVersionadoBase):
    # Se unifica usando el nombre canónico: version_documento_url
    version_documento_url: str
    archivo_nombre: Optional[str] = None
    subido_por_id: Optional[int] = None
    fecha_vigencia: Optional[date] = None


class DocumentoVersionado(DocumentoVersionadoBase):
    id: int
    version_vigente: Optional[VersionDocumento] = None
    model_config = ConfigDict(from_attributes=True)