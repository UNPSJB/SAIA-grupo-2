from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Enum as SQLEnum, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.asociaciones.plan_tareas import plan_tarea
from src.models import ModeloBase
from src.tareas.constants import FrecuenciaTarea

if TYPE_CHECKING:
    from src.planes.models import Plan
    from src.productos_limpieza.models import ProductoLimpieza
    from src.empleados.models import Empleado


class Tarea(ModeloBase):
    __tablename__ = "tareas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(index=True)
    frecuencia: Mapped[FrecuenciaTarea] = mapped_column(
        SQLEnum(
            FrecuenciaTarea,
            values_callable=lambda x: [e.value for e in x],
            create_constraint=True,
        )
    )

    # Campos para registrar autoria
    completada: Mapped[bool] = mapped_column(default=False)
    completada_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"), nullable=True)
    fecha_finalizacion: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Lista de planes en los que se encuentra
    planes: Mapped[List["Plan"]] = relationship(
        "Plan",
        secondary="plan_tarea",
        back_populates="tareas",
    )

    consumos_estimados: Mapped[List["ConsumoEstimado"]] = relationship(
        "ConsumoEstimado",
        back_populates="tarea",
        cascade="all, delete-orphan",
    )

    completada_por: Mapped[Optional["Empleado"]] = relationship("Empleado")


class ConsumoEstimado(ModeloBase):
    __tablename__ = "consumos_estimados"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas.id", ondelete="CASCADE"))
    producto_limpieza_id: Mapped[int] = mapped_column(
        ForeignKey("productos_limpieza.id")
    )
    cantidad: Mapped[float] = mapped_column()

    tarea: Mapped["Tarea"] = relationship("Tarea", back_populates="consumos_estimados")
    producto_limpieza: Mapped["ProductoLimpieza"] = relationship("ProductoLimpieza")
