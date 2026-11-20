from sqlalchemy import Column, Integer, String, Text
from src.models import ModeloBase

class ConfiguracionEmpresa(ModeloBase):
    __tablename__ = "configuracion_empresa"

    id = Column(Integer, primary_key=True, index=True)
    nombre_empresa = Column(String(150), default="Mi Empresa PYME", nullable=False)
    cuit = Column(String(30), default="30-00000000-0", nullable=False)
    domicilio = Column(String(200), default="Calle Principal 123", nullable=False)
    telefono = Column(String(50), default="011 4000-0000", nullable=False)
    email = Column(String(100), default="contacto@pyme.com", nullable=False)
    logo_base64 = Column(Text, nullable=True)
