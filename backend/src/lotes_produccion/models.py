from datetime import date

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase


class LoteProduccion(ModeloBase):
    """Registro simple de una tanda producida: que producto, cuando y cuanto."""

    __tablename__ = "lotes_produccion"

    nro_lote: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), index=True)
    fecha: Mapped[date] = mapped_column(index=True)
    cantidad: Mapped[float]

    producto: Mapped["src.productos.models.Producto"] = relationship(
        "src.productos.models.Producto", lazy="selectin"
    )
