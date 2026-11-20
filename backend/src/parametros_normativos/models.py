from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.datos_nutricionales.constants import Nutriente
from src.models import ModeloBase
from src.parametros_normativos.constants import (
    Agregado,
    ClaveParametro,
    CondicionCriterio,
    EstadoConjunto,
    FormaCriterio,
    SelloAdvertencia,
)
from src.productos.constants import TipoProducto


def _enum(tipo):
    return SQLEnum(tipo, values_callable=lambda x: [e.value for e in x], create_constraint=True)


class ConjuntoParametros(ModeloBase):
    """Una version de los parametros del rotulado frontal: umbrales, formulas, textos y reglas de aplicabilidad.

    Publicada queda de solo lectura. La vigente es la publicada con la fecha de vigencia mas reciente
    que no sea posterior a hoy; los calculos guardan la version que usaron para poder reconstruirlos.
    """

    __tablename__ = "parametros_normativos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    version: Mapped[int] = mapped_column(unique=True)
    estado: Mapped[EstadoConjunto] = mapped_column(_enum(EstadoConjunto), default=EstadoConjunto.BORRADOR)
    norma_origen: Mapped[str] = mapped_column(String(300))
    fecha_vigencia: Mapped[date]
    notas: Mapped[Optional[str]] = mapped_column(Text)
    fecha_creacion: Mapped[datetime]
    creado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"))
    fecha_publicacion: Mapped[Optional[datetime]]
    publicado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"))

    creado_por: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado", foreign_keys=[creado_por_id], lazy="selectin"
    )
    publicado_por: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado", foreign_keys=[publicado_por_id], lazy="selectin"
    )
    criterios: Mapped[List["CriterioSello"]] = relationship(
        back_populates="conjunto", cascade="all, delete-orphan", order_by="CriterioSello.orden", lazy="selectin"
    )
    textos: Mapped[List["TextoSello"]] = relationship(
        back_populates="conjunto", cascade="all, delete-orphan", order_by="TextoSello.orden", lazy="selectin"
    )
    sellos_por_agregado: Mapped[List["SelloPorAgregado"]] = relationship(
        back_populates="conjunto", cascade="all, delete-orphan", lazy="selectin"
    )
    clases_aditivo: Mapped[List["ClaseAditivoPorAgregado"]] = relationship(
        back_populates="conjunto", cascade="all, delete-orphan", order_by="ClaseAditivoPorAgregado.id", lazy="selectin"
    )
    excepciones: Mapped[List["ExcepcionRotulado"]] = relationship(
        back_populates="conjunto", cascade="all, delete-orphan", order_by="ExcepcionRotulado.orden", lazy="selectin"
    )
    parametros_generales: Mapped[List["ParametroGeneral"]] = relationship(
        back_populates="conjunto", cascade="all, delete-orphan", lazy="selectin"
    )


class CriterioSello(ModeloBase):
    """Punto de corte de un sello. Varios criterios del mismo sello y tipo de producto se combinan con O.

    porcentaje_energia: gramos x factor_energetico x 100 / kcal >= limite.
    cantidad_cada_100: contenido cada 100 g o 100 ml >= limite.
    mg_por_kcal: mg del nutriente / kcal >= limite.
    """

    __tablename__ = "parametros_criterios_sello"

    id: Mapped[int] = mapped_column(primary_key=True)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("parametros_normativos.id", ondelete="CASCADE"), index=True)
    sello: Mapped[SelloAdvertencia] = mapped_column(_enum(SelloAdvertencia))
    tipo_producto: Mapped[TipoProducto] = mapped_column(_enum(TipoProducto))
    forma: Mapped[FormaCriterio] = mapped_column(_enum(FormaCriterio))
    nutriente: Mapped[Nutriente] = mapped_column(_enum(Nutriente))
    limite: Mapped[float]
    unidad: Mapped[str] = mapped_column(String(20))
    factor_energetico: Mapped[Optional[float]]
    condicion: Mapped[CondicionCriterio] = mapped_column(_enum(CondicionCriterio), default=CondicionCriterio.SIEMPRE)
    orden: Mapped[int] = mapped_column(default=0)

    conjunto: Mapped[ConjuntoParametros] = relationship(back_populates="criterios")


class TextoSello(ModeloBase):
    __tablename__ = "parametros_textos_sello"
    __table_args__ = (UniqueConstraint("conjunto_id", "sello", name="uq_texto_sello_conjunto"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("parametros_normativos.id", ondelete="CASCADE"), index=True)
    sello: Mapped[SelloAdvertencia] = mapped_column(_enum(SelloAdvertencia))
    texto: Mapped[str] = mapped_column(String(120))
    orden: Mapped[int] = mapped_column(default=0)

    conjunto: Mapped[ConjuntoParametros] = relationship(back_populates="textos")


class SelloPorAgregado(ModeloBase):
    """Regla de aplicabilidad: que sellos o leyendas corresponde evaluar si el producto tiene ese agregado."""

    __tablename__ = "parametros_sellos_por_agregado"
    __table_args__ = (UniqueConstraint("conjunto_id", "agregado", "sello", name="uq_sello_por_agregado"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("parametros_normativos.id", ondelete="CASCADE"), index=True)
    agregado: Mapped[Agregado] = mapped_column(_enum(Agregado))
    sello: Mapped[SelloAdvertencia] = mapped_column(_enum(SelloAdvertencia))

    conjunto: Mapped[ConjuntoParametros] = relationship(back_populates="sellos_por_agregado")


class ClaseAditivoPorAgregado(ModeloBase):
    """Marca de aplicabilidad: un aditivo de esta clase funcional en la receta marca al producto con el agregado.

    La clase se compara por nombre, en minusculas, con las clases funcionales de aditivos.
    """

    __tablename__ = "parametros_clases_aditivo"
    __table_args__ = (UniqueConstraint("conjunto_id", "agregado", "clase_funcional", name="uq_clase_aditivo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("parametros_normativos.id", ondelete="CASCADE"), index=True)
    agregado: Mapped[Agregado] = mapped_column(_enum(Agregado))
    clase_funcional: Mapped[str] = mapped_column(String(100))

    conjunto: Mapped[ConjuntoParametros] = relationship(back_populates="clases_aditivo")


class ExcepcionRotulado(ModeloBase):
    __tablename__ = "parametros_excepciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("parametros_normativos.id", ondelete="CASCADE"), index=True)
    descripcion: Mapped[str] = mapped_column(String(300))
    orden: Mapped[int] = mapped_column(default=0)

    conjunto: Mapped[ConjuntoParametros] = relationship(back_populates="excepciones")


class ParametroGeneral(ModeloBase):
    __tablename__ = "parametros_generales"
    __table_args__ = (UniqueConstraint("conjunto_id", "clave", name="uq_parametro_general"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("parametros_normativos.id", ondelete="CASCADE"), index=True)
    clave: Mapped[ClaveParametro] = mapped_column(_enum(ClaveParametro))
    valor: Mapped[float]
    unidad: Mapped[str] = mapped_column(String(30))
    descripcion: Mapped[str] = mapped_column(String(200))

    conjunto: Mapped[ConjuntoParametros] = relationship(back_populates="parametros_generales")


class ModuloRotuladoFrontal(ModeloBase):
    """Interruptor unico del modulo de octogonos: apagado, el resto del sistema sigue funcionando."""

    __tablename__ = "modulo_rotulado_frontal"

    id: Mapped[int] = mapped_column(primary_key=True)
    activo: Mapped[bool] = mapped_column(default=True)
    fecha_cambio: Mapped[Optional[datetime]]
    cambiado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"))

    cambiado_por: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado", lazy="selectin"
    )
