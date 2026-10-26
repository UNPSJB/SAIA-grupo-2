from pydantic import BaseModel, ConfigDict
from src.documentos_versionados.constants import TipoDocumentoVersionado

class VersionDocumentoBase(BaseModel):
    documentos_versionados_id: int
    version_documento_url: str

class VersionDocumentoCreate(VersionDocumentoBase):
    pass
class VersionDocumento(VersionDocumentoBase):
    version: int
    model_config = ConfigDict(from_attributes=True)



class DocumentoVersionadoBase(BaseModel):
    nombre:str
    tipo: TipoDocumentoVersionado

class DocumentoVersionadoCreate(DocumentoVersionadoBase):
    version_inicial_url: str
class DocumentoVersionado(DocumentoVersionadoBase):
    id:int
    model_config=ConfigDict(from_attributes=True)