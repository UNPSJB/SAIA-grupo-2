from sqlalchemy import Boolean, Column, DateTime, Integer, String
from src.models import ModeloBase
from src.vista_publica.constants import LARGO_CONTACTO, LARGO_PRESENTACION, LARGO_TITULO_PUBLICO

class ConfiguracionVistaPublica(ModeloBase):
    __tablename__ = "configuracion_vista_publica"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), default="Vista Pública", nullable=False)
    activa = Column(Boolean, default=False, nullable=False)
    fecha_activacion = Column(DateTime(timezone=True), nullable=True)
    token = Column(String(64), unique=True, index=True, nullable=True)

    mostrar_cumplimiento_limpieza = Column(Boolean, default=False, nullable=False)
    mostrar_equipos_calibrados = Column(Boolean, default=False, nullable=False)
    mostrar_capacitaciones = Column(Boolean, default=False, nullable=False)
    mostrar_poes_vigentes = Column(Boolean, default=False, nullable=False)
    mostrar_trazabilidad_lotes = Column(Boolean, default=False, nullable=False)

    titulo_publico = Column(String(LARGO_TITULO_PUBLICO), nullable=True)
    presentacion = Column(String(LARGO_PRESENTACION), nullable=True)
    contacto = Column(String(LARGO_CONTACTO), nullable=True)
