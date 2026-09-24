from sqlalchemy import ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.productos_limpieza.constants import TipoProductoLimpieza


class ProductoLimpieza(ModeloBase):
    __tablename__ = "productos_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    tipo: Mapped[TipoProductoLimpieza] = mapped_column(
        SQLEnum(
            TipoProductoLimpieza,
            values_callable=lambda x: [e.value for e in x],
            create_constraint=True,
        )
    )
    stock: Mapped[float] = mapped_column(default=0)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_medida.id"))

    unidad_medida: Mapped["src.unidades_medida.models.UnidadMedida"] = relationship(
        "src.unidades_medida.models.UnidadMedida"
    )
