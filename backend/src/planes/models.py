from datetime import date
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.asociaciones.plan_equipo import plan_equipo
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.empleados.models import Empleado
    from src.equipos.models import Equipo
    from src.sectores.models import Sector
    from src.tareas.models import Tarea


class Plan(ModeloBase):
    __tablename__ = "planes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(index=True)
    fecha_inicio: Mapped[date] = mapped_column()
    fecha_fin: Mapped[Optional[date]] = mapped_column(default=None)
    sector_id: Mapped[int] = mapped_column(ForeignKey("sectores.id"))

    sector: Mapped["Sector"] = relationship("Sector")

    equipos: Mapped[List["Equipo"]] = relationship(
        "Equipo",
        secondary=plan_equipo,
    )

    asignaciones: Mapped[List["AsignacionPlan"]] = relationship(
        "AsignacionPlan",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="AsignacionPlan.fecha_asignacion",
    )

    tareas: Mapped[List["Tarea"]] = relationship(
        "Tarea",
        back_populates="plan",
    )

    @property
    def responsable_actual(self):
        for asignacion in self.asignaciones:
            if asignacion.fecha_fin is None:
                return asignacion.empleado
        return None


class AsignacionPlan(ModeloBase):
    __tablename__ = "asignaciones_plan"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes.id", ondelete="CASCADE"))
    empleado_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"))
    fecha_asignacion: Mapped[date] = mapped_column()
    fecha_fin: Mapped[Optional[date]] = mapped_column(default=None)

    plan: Mapped["Plan"] = relationship("Plan", back_populates="asignaciones")
    empleado: Mapped["Empleado"] = relationship("Empleado")
