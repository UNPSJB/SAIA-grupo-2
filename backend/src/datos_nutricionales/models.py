from datetime import datetime
from typing import Optional

from sqlalchemy import Enum as SQLEnum, Float, Integer, String, UniqueConstraint
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.datos_nutricionales.constants import FuenteDatoNutricional, Nutriente
from src.models import ModeloBase


class DatoNutricionalInsumo(ModeloBase):
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


class ValorDiarioReferencia(ModeloBase):
    __tablename__ = "valores_diarios_referencia"

    nutriente: Mapped[Nutriente] = mapped_column(
        SQLEnum(Nutriente, values_callable=lambda x: [e.value for e in x], create_constraint=True),
        primary_key=True,
    )
    valor_diario: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unidad: Mapped[str] = mapped_column(String(20), default="g")
    umbral_no_significativo: Mapped[float] = mapped_column(Float, default=0.0)
    decimales: Mapped[int] = mapped_column(Integer, default=1)
