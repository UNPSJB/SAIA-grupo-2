import enum
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.asociaciones.empleado_capacidad import empleado_capacidad
from src.asociaciones.empleado_sector import empleado_sector

if TYPE_CHECKING:
    from src.capacidades.models import Capacidad
    from src.sectores.models import Sector
    from src.documentacion.models import Documentacion 

class RolEmpleado(str, enum.Enum):
    ADMIN = "admin"
    OPERARIO = "operario"

class Empleado(ModeloBase):
    __tablename__="empleados"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    legajo: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    dni: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    apellido: Mapped[str] = mapped_column(index=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    rol: Mapped[RolEmpleado] = mapped_column(Enum(RolEmpleado), default=RolEmpleado.OPERARIO, nullable=False)
    
    capacidades: Mapped[Optional[List["Capacidad"]]] = relationship(
        "Capacidad",
        secondary=empleado_capacidad,
        back_populates="empleados"
    )

    sectores: Mapped[Optional[List["Sector"]]] = relationship(
        "Sector",
        secondary=empleado_sector,
        back_populates="empleados"
    )

    documentacion: Mapped[List["Documentacion"]] = relationship(
        "Documentacion",
        back_populates="empleado",
        cascade="all, delete-orphan"
    )
