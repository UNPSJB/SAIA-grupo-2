from sqlalchemy import ForeignKey, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.sectores.models import Sector

class TipoEquipo(ModeloBase):
    __tablename__ = "tipos_equipo"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    
    equipos: Mapped[list["Equipo"]] = relationship(back_populates="tipo")

class Equipo(ModeloBase):
    __tablename__ = "equipos"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column()
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    
    sector_id: Mapped[int] = mapped_column(ForeignKey("sectores.id"))
    tipo_id: Mapped[int] = mapped_column(ForeignKey("tipos_equipo.id"))
    
    tipo: Mapped["TipoEquipo"] = relationship(back_populates="equipos")
    sector: Mapped["Sector"] = relationship()