from typing import Optional, List
from datetime import date, datetime
from sqlalchemy import Date, Enum as SQLEnum, ForeignKey, JSON, String, Text, Boolean, Float, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign

from src.models import ModeloBase
from src.asociaciones.detalle_receta import detalle_receta
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo, FormatoDeclaracionAditivos


class ConfiguracionProduccion(ModeloBase):
    __tablename__ = "configuracion_produccion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    formato_declaracion_aditivos: Mapped[FormatoDeclaracionAditivos] = mapped_column(
        SQLEnum(
            FormatoDeclaracionAditivos,
            values_callable=lambda enum_values: [value.value for value in enum_values],
            create_constraint=True,
        ),
        nullable=False,
        default=FormatoDeclaracionAditivos.FUNCION_AMBOS,
    )

class DetalleReceta(ModeloBase):
    __table__ = detalle_receta

class Receta(ModeloBase):
    __tablename__ = "recetas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False, index=True, unique=True)
    producto: Mapped["src.productos.models.Producto"] = relationship()

class VersionReceta(ModeloBase):
    __tablename__ = "version_receta"
    receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"), primary_key=True, index=True)
    version: Mapped[int] = mapped_column(primary_key=True, index=True)

    rendimiento_final_gramos: Mapped[float] = mapped_column(nullable=False)
    unidad_venta_gramos: Mapped[float] = mapped_column(nullable=False)
    medida_casera: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    motivo_cambio: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    creado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"), nullable=True)

    estado: Mapped[EstadoVersionReceta] = mapped_column(
        SQLEnum(
            EstadoVersionReceta,
            values_callable=lambda enum_values: [value.value for value in enum_values],
            create_constraint=True,
        ),
        nullable=False,
        default=EstadoVersionReceta.ACTIVO,
    )
    fecha_vigencia: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        default=date.today,
    )

    
    orden_ingredientes_manual: Mapped[Optional[List[int]]] = mapped_column(JSON, nullable=True)
    orden_manual_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"), nullable=True)
    orden_manual_fecha: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    aviso_orden_anterior: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    orden_manual_por: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado",
        foreign_keys=[orden_manual_por_id],
        lazy="selectin",
    )

    detalles: Mapped[List["DetalleReceta"]] = relationship(
        "DetalleReceta",
        primaryjoin="and_(foreign(DetalleReceta.receta_id)==VersionReceta.receta_id, foreign(DetalleReceta.nro_version)==VersionReceta.version)",
        order_by="DetalleReceta.renglon",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    pasos: Mapped[List["PasoReceta"]] = relationship(
        "PasoReceta",
        primaryjoin="and_(foreign(PasoReceta.receta_id)==VersionReceta.receta_id, foreign(PasoReceta.version)==VersionReceta.version)",
        order_by="PasoReceta.orden",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

class PasoReceta(ModeloBase):
    __tablename__ = "pasos_receta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    receta_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    nombre_paso: Mapped[str] = mapped_column(String(150), nullable=False)
    procedimiento: Mapped[str] = mapped_column(Text, nullable=False)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), nullable=True)
    tiempo_minutos: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    temperatura_celsius: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    es_punto_control: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    equipo: Mapped[Optional["src.equipos.models.Equipo"]] = relationship(
        "src.equipos.models.Equipo", lazy="selectin"
    )
