from typing import Optional
from pydantic import BaseModel, ConfigDict

class ConfiguracionEmpresaBase(BaseModel):
    nombre_empresa: str = "Mi Empresa PYME"
    cuit: str = "30-00000000-0"
    domicilio: str = "Calle Principal 123"
    telefono: str = "011 4000-0000"
    email: str = "contacto@pyme.com"
    logo_base64: Optional[str] = None

class ConfiguracionEmpresaUpdate(BaseModel):
    nombre_empresa: Optional[str] = None
    cuit: Optional[str] = None
    domicilio: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    logo_base64: Optional[str] = None

class ConfiguracionEmpresaResponse(ConfiguracionEmpresaBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
