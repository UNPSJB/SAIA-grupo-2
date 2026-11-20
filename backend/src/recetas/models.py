from typing import Optional

from datetime import date
from sqlalchemy import Date, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.asociaciones.detalle_receta import detalle_receta
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo

class DetalleReceta(ModeloBase):
    __table__ = detalle_receta

class Receta(ModeloBase):
    __tablename__="recetas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False, index=True, unique=True)
    producto: Mapped["src.productos.models.Producto"] = relationship()


class VersionReceta(ModeloBase):
    __tablename__="version_receta"
    receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"), primary_key=True, index=True)
    version: Mapped[int] = mapped_column(primary_key=True, index=True)

    rendimiento_final_gramos: Mapped[float] = mapped_column(nullable=False)
    unidad_venta_gramos: Mapped[float] = mapped_column(nullable=False) 
    estado: Mapped[EstadoVersionReceta] = mapped_column(
        SQLEnum(
            EstadoVersionReceta,
            values_callable=lambda enum_values: [value.value for value in enum_values],
            create_constraint=True,
        ),
        nullable=False,
        default=EstadoVersionReceta.ACTIVO,
    )
    fecha_vigencia: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        default=date.today,
    )