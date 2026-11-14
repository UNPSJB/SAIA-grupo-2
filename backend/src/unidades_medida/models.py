from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from src.models import ModeloBase
from src.unidades_medida.constants import MagnitudUnidad


class UnidadMedida(ModeloBase):
    """Unidad del catalogo fijo. factor_base convierte a la unidad base de su magnitud (g, ml o unidades)."""

    __tablename__ = "unidades_medida"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(unique=True, index=True)
    magnitud: Mapped[MagnitudUnidad] = mapped_column(
        SQLEnum(MagnitudUnidad, values_callable=lambda x: [e.value for e in x], create_constraint=True),
        default=MagnitudUnidad.CANTIDAD,
    )
    factor_base: Mapped[float] = mapped_column(default=1.0)
