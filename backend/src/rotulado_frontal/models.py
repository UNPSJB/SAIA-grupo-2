from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.rotulado_frontal.constants import ResultadoAplicabilidad


class EvaluacionAplicabilidad(ModeloBase):
    """Respuesta a si al producto le corresponde rotulado frontal, con la version de parametros usada.

    Cada evaluacion se guarda como un registro nuevo: la ultima es la vigente y las anteriores
    quedan como historial, cada una con los parametros con los que se hizo.
    """

    __tablename__ = "evaluaciones_rotulado_frontal"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), index=True)
    parametros_id: Mapped[int] = mapped_column(ForeignKey("parametros_normativos.id"))
    envasado_en_ausencia_del_cliente: Mapped[bool]
    excepcion: Mapped[Optional[str]] = mapped_column(String(300))
    agrega_azucares: Mapped[bool] = mapped_column(default=False)
    agrega_grasas: Mapped[bool] = mapped_column(default=False)
    agrega_sodio: Mapped[bool] = mapped_column(default=False)
    contiene_edulcorantes: Mapped[bool] = mapped_column(default=False)
    contiene_cafeina: Mapped[bool] = mapped_column(default=False)
    version_receta: Mapped[Optional[int]]
    marcas_corregidas: Mapped[bool] = mapped_column(default=False)
    resultado: Mapped[ResultadoAplicabilidad] = mapped_column(
        SQLEnum(ResultadoAplicabilidad, values_callable=lambda x: [e.value for e in x], create_constraint=True)
    )
    sellos: Mapped[List[str]] = mapped_column(JSON, default=list)
    fecha: Mapped[datetime]
    evaluado_por_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"))

    producto: Mapped["src.productos.models.Producto"] = relationship("src.productos.models.Producto", lazy="selectin")
    parametros: Mapped["src.parametros_normativos.models.ConjuntoParametros"] = relationship(
        "src.parametros_normativos.models.ConjuntoParametros", lazy="selectin"
    )
    evaluado_por: Mapped["src.empleados.models.Empleado"] = relationship("src.empleados.models.Empleado", lazy="selectin")


class MarcaInsumo(ModeloBase):
    """Que aporta el insumo al producto cuando forma parte de la receta, a efectos del rotulado frontal."""

    __tablename__ = "marcas_rotulado_insumo"

    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id", ondelete="CASCADE"), primary_key=True)
    agrega_azucares: Mapped[bool] = mapped_column(default=False)
    agrega_grasas: Mapped[bool] = mapped_column(default=False)
    agrega_sodio: Mapped[bool] = mapped_column(default=False)
    contiene_edulcorantes: Mapped[bool] = mapped_column(default=False)
    contiene_cafeina: Mapped[bool] = mapped_column(default=False)
    fecha_cambio: Mapped[datetime]
    cambiado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"))

    insumo: Mapped["src.insumos.models.Insumo"] = relationship("src.insumos.models.Insumo", lazy="selectin")
    cambiado_por: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado", lazy="selectin"
    )
