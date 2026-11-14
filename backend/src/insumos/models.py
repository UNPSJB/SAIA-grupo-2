from sqlalchemy import Boolean, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase


class Insumo(ModeloBase):
    """cantidad es el stock disponible expresado en la unidad base de su magnitud: gramos o mililitros."""

    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_medida.id"))
    cantidad: Mapped[float] = mapped_column(Float, default=0.0)

    unidad_medida: Mapped["src.unidades_medida.models.UnidadMedida"] = relationship(
        "src.unidades_medida.models.UnidadMedida"
    )
