from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from src.models import ModeloBase
from src.equipos.constants import EstadoEquipo


class Equipo(ModeloBase):
    __tablename__ = "equipos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column()
    activo: Mapped[bool] = mapped_column()
    ubicacion: Mapped[str] = mapped_column()
    tipo: Mapped[str] = mapped_column()
    estado: Mapped[EstadoEquipo] = mapped_column(
        SQLEnum(
            EstadoEquipo,
            values_callable=lambda x: [e.value for e in x],
            create_constraint=True,
        ),
        default=EstadoEquipo.BUENO,
    )
