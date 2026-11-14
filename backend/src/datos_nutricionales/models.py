from datetime import datetime
from typing import Optional

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.datos_nutricionales.constants import FuenteDatoNutricional, Nutriente
from src.models import ModeloBase


class DatoNutricionalInsumo(ModeloBase):
    """Valor de un nutriente cada 100 g (o 100 ml) de un insumo, con la fuente de la que surgio y su auditoria.

    valor_fuente guarda lo que informa la fuente al momento de la carga; si el valor vigente
    difiere, el dato queda marcado como modificado y se registra quien y cuando lo cambio.
    """

    __tablename__ = "datos_nutricionales_insumo"
    __table_args__ = (UniqueConstraint("insumo_id", "nutriente", name="uq_dato_nutricional_insumo"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id", ondelete="CASCADE"), index=True)
    nutriente: Mapped[Nutriente] = mapped_column(
        SQLEnum(Nutriente, values_callable=lambda x: [e.value for e in x], create_constraint=True)
    )
    valor: Mapped[float]
    fuente: Mapped[FuenteDatoNutricional] = mapped_column(
        SQLEnum(FuenteDatoNutricional, values_callable=lambda x: [e.value for e in x], create_constraint=True)
    )
    alimento_codigo: Mapped[Optional[str]] = mapped_column(ForeignKey("alimentos_referencia.codigo"))
    referencia: Mapped[Optional[str]] = mapped_column(String(200))
    valor_fuente: Mapped[float]
    fecha_carga: Mapped[datetime]
    cargado_por_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"))
    modificado: Mapped[bool] = mapped_column(default=False)
    modificado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"))
    fecha_modificacion: Mapped[Optional[datetime]]

    alimento: Mapped[Optional["src.alimentos_referencia.models.AlimentoReferencia"]] = relationship(
        "src.alimentos_referencia.models.AlimentoReferencia", lazy="selectin"
    )
    cargado_por: Mapped["src.empleados.models.Empleado"] = relationship(
        "src.empleados.models.Empleado", foreign_keys=[cargado_por_id], lazy="selectin"
    )
    modificado_por: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado", foreign_keys=[modificado_por_id], lazy="selectin"
    )
