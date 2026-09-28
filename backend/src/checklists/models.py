from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, Float, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.capacidades.models import Capacidad
from src.unidades_medida.models import UnidadMedida
from src.insumos.models import Insumo
from src.tareas.models import Tarea
from src.empleados.models import Empleado
from src.productos_limpieza.models import ProductoLimpieza
from src.sectores.models import Sector
from src.equipos.models import Equipo
from src.planes.models import Plan

class ConsumoReal(ModeloBase):
    __tablename__ = "consumos_reales"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    checklist_id: Mapped[int] = mapped_column(ForeignKey("checklists.id", ondelete="CASCADE"))
    producto_limpieza_id: Mapped[int] = mapped_column(ForeignKey("productos_limpieza.id"))
    cantidad: Mapped[float] = mapped_column(Float)

    checklist: Mapped["Checklist"] = relationship("Checklist", back_populates="consumos_reales")
    producto_limpieza: Mapped["ProductoLimpieza"] = relationship("ProductoLimpieza")


class Checklist(ModeloBase):
    __tablename__ = "checklists"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas.id", ondelete="CASCADE"))
    plan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("planes.id", ondelete="CASCADE"), nullable=True)
    fecha_programada: Mapped[date] = mapped_column(Date, default=date.today)
    realizada: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha_hora_completada: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    empleado_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"), nullable=True)
    evidencia_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    observaciones: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default=None)

    tarea: Mapped["Tarea"] = relationship("Tarea")
    plan: Mapped[Optional["Plan"]] = relationship("Plan")
    empleado: Mapped[Optional["Empleado"]] = relationship("Empleado")
    consumos_reales: Mapped[List["ConsumoReal"]] = relationship(
        "ConsumoReal",
        back_populates="checklist",
        cascade="all, delete-orphan",
    )
