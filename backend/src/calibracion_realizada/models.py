from typing import Optional, TYPE_CHECKING
from src.models import ModeloBase
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey

from src.equipos.models import Equipo

class CalibracionRealizada(ModeloBase):
    __tablename__="calibracion_realizada"
    fecha: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    equipo_id: Mapped[int] = mapped_column(ForeignKey("equipos.id", ondelete="CASCADE"), primary_key=True, index=True)
    
    equipo: Mapped[Equipo] = relationship("Equipo", back_populates="calibraciones_realizadas")
    certificacion_url: Mapped[str] = mapped_column(String(255), nullable=False)