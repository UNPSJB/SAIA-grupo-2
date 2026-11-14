from sqlalchemy import Boolean, Column, DateTime, Integer, String
from src.models import ModeloBase

class ConfiguracionVistaPublica(ModeloBase):
    __tablename__ = "configuracion_vista_publica"

    id = Column(Integer, primary_key=True, index=True)
    activa = Column(Boolean, default=False, nullable=False)
    fecha_activacion = Column(DateTime(timezone=True), nullable=True)
    token = Column(String(64), unique=True, index=True, nullable=True)

    mostrar_cumplimiento_limpieza = Column(Boolean, default=False, nullable=False)
    mostrar_equipos_calibrados = Column(Boolean, default=False, nullable=False)
    mostrar_capacitaciones = Column(Boolean, default=False, nullable=False)
