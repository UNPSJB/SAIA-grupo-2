from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.productos.constants import TipoProducto


class Producto(ModeloBase):
    """Producto elaborado por el establecimiento, sobre el que se registran los lotes de produccion."""

    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    tipo: Mapped[TipoProducto] = mapped_column(
        SQLEnum(
            TipoProducto,
            values_callable=lambda x: [e.value for e in x],
            create_constraint=True,
        )
    )
    stock: Mapped[float] = mapped_column(default=0)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_medida.id"))

    unidad_medida: Mapped["src.unidades_medida.models.UnidadMedida"] = relationship(
        "src.unidades_medida.models.UnidadMedida"
    )
