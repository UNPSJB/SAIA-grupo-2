from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional
from src.documentos_versionados.constants import TipoDocumentoVersionado

class EmpleadoResumen(BaseModel):
    id: int
    legajo: str
    nombre: str
    apellido: str
    model_config = ConfigDict(from_attributes=True)

class VersionDocumentoBase(BaseModel):
    documentos_versionados_id: int
    version_documento_url: str
    archivo_nombre: Optional[str] = None
    fecha_vigencia: Optional[date] = None

class VersionDocumentoCreate(VersionDocumentoBase):
    subido_por_id: Optional[int] = None
    #pass


class VersionDocumento(VersionDocumentoBase):
    version: int
    estado: str = "activo"
    fecha_vigencia: Optional[date] = None
    fecha_subida: Optional[datetime] = None
    subido_por_id: Optional[int] = None
    subido_por: Optional[EmpleadoResumen] = None
    model_config = ConfigDict(from_attributes=True)
 

class DocumentoVersionadoBase(BaseModel):
    nombre:str
    tipo: TipoDocumentoVersionado
    

class DocumentoVersionadoCreate(DocumentoVersionadoBase):
    version_inicial_url: str
    archivo_nombre: Optional[str] = None
    subido_por_id: Optional[int] = None
    fecha_vigencia: Optional[date] = None
    
class DocumentoVersionado(DocumentoVersionadoBase):
    id:int
    version_vigente: Optional[VersionDocumento] = None
    model_config=ConfigDict(from_attributes=True)