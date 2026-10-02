from sqlalchemy import ForeignKey, String, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional
from datetime import date,timedelta

from src.models import ModeloBase
from src.equipos.constants import EstadoEquipo, EstadoCalibracion, DIAS_AVISO_PREVIO

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
    frecuencia_calibracion_dias: Mapped[Optional[int]] = mapped_column(default=None)
    fecha_ultima_calibracion: Mapped[date] = mapped_column()

    @property
    def fecha_vencimiento(self) -> Optional[date]:
        if self.frecuencia_calibracion_dias is None:
            return None
        return self.fecha_ultima_calibracion + timedelta(days=self.frecuencia_calibracion_dias)

    @property
    def dias_restantes(self) -> Optional[int]:
        proxima = self.fecha_vencimiento
        if proxima is None:
            return None
        return (proxima - date.today()).days

    @property
    def estado_calibracion(self) -> EstadoCalibracion:
        proxima = self.fecha_vencimiento
        if proxima is None:
            return EstadoCalibracion.SIN_CONTROL

        hoy = date.today()
        if proxima <= hoy:
            return EstadoCalibracion.VENCIDO
        if proxima <= hoy + timedelta(days=DIAS_AVISO_PREVIO):
            return EstadoCalibracion.PROXIMO
        return EstadoCalibracion.VIGENTE
    
    sector_id: Mapped[int] = mapped_column(ForeignKey("sectores.id"))
    tipo_id: Mapped[int] = mapped_column(ForeignKey("tipos_equipo.id"))
    
    tipo: Mapped["TipoEquipo"] = relationship(back_populates="equipos")
    sector: Mapped["Sector"] = relationship("Sector", back_populates="equipos")
    
    estado: Mapped[EstadoEquipo] = mapped_column(
        SQLEnum(
            EstadoEquipo,
            values_callable=lambda x: [e.value for e in x],
            create_constraint=True,
        ),
        default=EstadoEquipo.BUENO,
    )