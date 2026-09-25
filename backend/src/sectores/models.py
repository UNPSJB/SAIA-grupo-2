from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase

if TYPE_CHECKING:
    from src.empleados.models import Empleado


class Sector(ModeloBase):
    __tablename__ = "sectores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(index=True)
    encargado_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"))

    encargado: Mapped["Empleado"] = relationship("Empleado")
