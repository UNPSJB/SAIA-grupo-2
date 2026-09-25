from datetime import date
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.asociaciones.plan_tareas import plan_tarea
from src.asociaciones.plan_equipo import plan_equipo
from src.models import ModeloBase

if TYPE_CHECKING:
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

    tareas: Mapped[List["Tarea"]] = relationship(
        "Tarea",
        secondary="plan_tarea",
        back_populates="planes",
    )
