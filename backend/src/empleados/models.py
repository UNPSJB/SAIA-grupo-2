from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.asociaciones.empleado_capacidad import empleado_capacidad

if TYPE_CHECKING:
    from src.capacidades.models import Capacidad

class Empleado(ModeloBase):
    __tablename__="empleados"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    legajo: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    dni: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    apellido: Mapped[str] = mapped_column(index=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    
    capacidades: Mapped[Optional[List["Capacidad"]]] = relationship(
        "Capacidad",
        secondary=empleado_capacidad,
        back_populates="empleados"
    )