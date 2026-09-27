<<<<<<< HEAD
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase

if TYPE_CHECKING:
    from src.empleados.models import Empleado

=======
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.asociaciones.empleado_sector import empleado_sector

if TYPE_CHECKING:
    from src.empleados.models import Empleado
    from src.equipos.models import Equipo
>>>>>>> origin/planes-rama

class Sector(ModeloBase):
    __tablename__ = "sectores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
<<<<<<< HEAD
    titulo: Mapped[str] = mapped_column(index=True)
    encargado_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"))

    encargado: Mapped["Empleado"] = relationship("Empleado")
=======
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    
    # Responsable a cargo del sector
    responsable_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"), nullable=True)
    responsable: Mapped[Optional["Empleado"]] = relationship("Empleado", foreign_keys=[responsable_id])

    # Lista de empleados
    empleados: Mapped[List["Empleado"]] = relationship(
        "Empleado",
        secondary=empleado_sector,
        back_populates="sectores"
    )

    equipos: Mapped[List["Equipo"]] = relationship("Equipo")
>>>>>>> origin/planes-rama
