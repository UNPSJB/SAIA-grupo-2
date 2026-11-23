from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase


class Rotulo(ModeloBase):
    __tablename__ = "rotulos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id"), nullable=False, unique=True, index=True
    )

    denominacion_venta: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    contenido_neto: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unidad_contenido_neto: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    rnpa_rppa: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    razon_social: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    domicilio: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)

    es_importado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    razon_social_importador: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    domicilio_importador: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    pais_origen: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    instrucciones_uso: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instrucciones_conservacion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lista_ingredientes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    ingredientes_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    nutricion_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sellos_snapshot: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    calculo_sellos_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("calculos_sellos_rotulado.id"), nullable=True
    )

    receta_id: Mapped[Optional[int]] = mapped_column(ForeignKey("recetas.id"), nullable=True)
    receta_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now, onupdate=datetime.now
    )

    producto: Mapped["src.productos.models.Producto"] = relationship(
        "src.productos.models.Producto", lazy="selectin"
    )
    receta: Mapped[Optional["src.recetas.models.Receta"]] = relationship(
        "src.recetas.models.Receta", lazy="selectin"
    )

    lotes: Mapped[List["RotuloLote"]] = relationship(
        "RotuloLote",
        back_populates="rotulo",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    cambios: Mapped[List["HistorialCambioRotulo"]] = relationship(
        "HistorialCambioRotulo",
        back_populates="rotulo",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class RotuloLote(ModeloBase):
    __tablename__ = "rotulos_lotes"
    __table_args__ = (
        UniqueConstraint("rotulo_id", "nro_lote", name="uq_rotulo_lote"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rotulo_id: Mapped[int] = mapped_column(
        ForeignKey("rotulos.id"), nullable=False, index=True
    )
    nro_lote: Mapped[int] = mapped_column(
        ForeignKey("lotes_produccion.nro_lote"), nullable=False, index=True
    )
    fecha_duracion: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now
    )

    rotulo: Mapped["Rotulo"] = relationship("Rotulo", back_populates="lotes")
    lote: Mapped["src.lotes_produccion.models.LoteProduccion"] = relationship(
        "src.lotes_produccion.models.LoteProduccion", lazy="selectin"
    )


class HistorialCambioRotulo(ModeloBase):
    __tablename__ = "historial_cambios_rotulo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rotulo_id: Mapped[int] = mapped_column(
        ForeignKey("rotulos.id"), nullable=False, index=True
    )
    campo: Mapped[str] = mapped_column(String(100), nullable=False)
    valor_original: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valor_nuevo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    empleado_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("empleados.id"), nullable=True
    )
    fecha_cambio: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now
    )

    rotulo: Mapped["Rotulo"] = relationship("Rotulo", back_populates="cambios")
    empleado: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado", lazy="selectin"
    )

    @property
    def empleado_nombre(self) -> Optional[str]:
        return self.empleado.nombre if self.empleado else None

    @property
    def empleado_apellido(self) -> Optional[str]:
        return self.empleado.apellido if self.empleado else None
