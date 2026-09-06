from typing import Optional, List, TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from sqlalchemy import String
from src.asociaciones.empleado_capacidad import empleado_capacidad

# Evita import circular/infinito
if TYPE_CHECKING:
    from src.empleados.models import Empleado

class Capacidad(ModeloBase):
    __tablename__ = "capacidades"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True)
    
    empleados: Mapped[Optional[List["Empleado"]]] = relationship(
        "Empleado",
        secondary=empleado_capacidad,
        back_populates="capacidades"
    )