from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.alergenos.constants import EstadoDeclaracion, UnidadDuracion
from src.models import ModeloBase


def _enum(tipo):
    return SQLEnum(tipo, values_callable=lambda x: [e.value for e in x], create_constraint=True)


class MarcaAlergenosInsumo(ModeloBase):
    """Alergenos y gluten que aporta un insumo (ingrediente o aditivo del maestro) cuando forma parte de una receta."""

    __tablename__ = "marcas_alergenos_insumo"

    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id", ondelete="CASCADE"), primary_key=True)
    alergenos: Mapped[List[str]] = mapped_column(JSON, default=list)
    contiene_gluten: Mapped[bool] = mapped_column(default=False)
    fecha_cambio: Mapped[datetime]
    cambiado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"))

    insumo: Mapped["src.insumos.models.Insumo"] = relationship("src.insumos.models.Insumo", lazy="selectin")
    cambiado_por: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado", lazy="selectin"
    )


class DeclaracionAlergenos(ModeloBase):
    """Declaracion de alergenos y gluten del producto.

    Guarda tambien la propuesta del sistema con la que se hizo, para avisar si despues la receta o las marcas
    de los insumos cambian. Queda como sugerida hasta que una persona con permiso de administrar la confirma.
    """

    __tablename__ = "declaraciones_alergenos"

    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True)
    contiene: Mapped[List[str]] = mapped_column(JSON, default=list)
    contiene_gluten: Mapped[bool] = mapped_column(default=False)
    puede_contener: Mapped[List[str]] = mapped_column(JSON, default=list)
    estado: Mapped[EstadoDeclaracion] = mapped_column(_enum(EstadoDeclaracion))
    version_receta: Mapped[Optional[int]]
    propuesta: Mapped[List[str]] = mapped_column(JSON, default=list)
    propuesta_gluten: Mapped[bool] = mapped_column(default=False)
    fecha_modificacion: Mapped[datetime]
    modificado_por_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"))
    fecha_confirmacion: Mapped[Optional[datetime]]
    confirmado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"))

    modificado_por: Mapped["src.empleados.models.Empleado"] = relationship(
        "src.empleados.models.Empleado", foreign_keys=[modificado_por_id], lazy="selectin"
    )
    confirmado_por: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado", foreign_keys=[confirmado_por_id], lazy="selectin"
    )


class CondicionesConservacion(ModeloBase):
    """Temperaturas y tiempo en que el elaborador garantiza la durabilidad del producto, mas otras instrucciones."""

    __tablename__ = "condiciones_conservacion"

    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True)
    temperatura_minima: Mapped[Optional[float]]
    temperatura_maxima: Mapped[Optional[float]]
    duracion: Mapped[Optional[int]]
    unidad_duracion: Mapped[UnidadDuracion] = mapped_column(_enum(UnidadDuracion), default=UnidadDuracion.DIAS)
    instrucciones: Mapped[Optional[str]] = mapped_column(String(300))
    fecha_modificacion: Mapped[datetime]
    modificado_por_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"))

    modificado_por: Mapped["src.empleados.models.Empleado"] = relationship("src.empleados.models.Empleado", lazy="selectin")
