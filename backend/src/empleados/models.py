from typing import Optional, List, TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.asociaciones.empleado_capacidad import empleado_capacidad

if TYPE_CHECKING:
    from src.capacidades.models import Capacidad

class Empleado(ModeloBase):
    __tablename__="empleados"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    apellido: Mapped[str] = mapped_column(index=True)
    capacidades: Mapped[Optional[List["Capacidad"]]] = relationship(
        "Capacidad",
        secondary=empleado_capacidad,
        back_populates="empleados"
    )