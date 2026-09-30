from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.documentacion.constants import TipoDocumentacion
from src.models import ModeloBase
from src.vencimientos import ControlDeVencimiento

if TYPE_CHECKING:
    from src.empleados.models import Empleado


class Documentacion(ModeloBase, ControlDeVencimiento):
    __tablename__ = "documentacion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    empleado_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"), index=True)
    fecha_vencimiento: Mapped[date] = mapped_column(Date)
    tipo: Mapped[TipoDocumentacion] = mapped_column(
        Enum(TipoDocumentacion, values_callable=lambda x: [e.value for e in x])
    )

    empleado: Mapped["Empleado"] = relationship("Empleado", back_populates="documentacion")

    requisito: Mapped[Optional["RequisitoDocumentacion"]] = relationship(
        "RequisitoDocumentacion",
        primaryjoin="foreign(Documentacion.tipo) == RequisitoDocumentacion.tipo",
        viewonly=True,
        lazy="joined",
    )

    @property
    def dias_aviso_previo(self) -> int:
        if self.requisito is not None:
            return self.requisito.dias_aviso_previo
        return self.DIAS_AVISO_PREVIO

    __mapper_args__ = {
        "polymorphic_on": tipo,
        "polymorphic_identity": None,
    }


class LibretaSanitaria(Documentacion):
    __tablename__ = "libretas_sanitarias"

    id: Mapped[int] = mapped_column(ForeignKey("documentacion.id"), primary_key=True)
    numero_carnet: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    autoridad_emisora: Mapped[str] = mapped_column(String(150))

    __mapper_args__ = {"polymorphic_identity": TipoDocumentacion.LIBRETA_SANITARIA}


class Capacitacion(Documentacion):
    __tablename__ = "capacitaciones"

    id: Mapped[int] = mapped_column(ForeignKey("documentacion.id"), primary_key=True)
    titulo: Mapped[str] = mapped_column(String(150))
    observaciones: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    __mapper_args__ = {"polymorphic_identity": TipoDocumentacion.CAPACITACION}


class CertificadoAptitudFisica(Documentacion):
    __tablename__ = "certificados_aptitud_fisica"

    id: Mapped[int] = mapped_column(ForeignKey("documentacion.id"), primary_key=True)
    nombre_medico: Mapped[str] = mapped_column(String(150))
    matricula: Mapped[str] = mapped_column(String(50))

    __mapper_args__ = {"polymorphic_identity": TipoDocumentacion.CERTIFICADO_APTITUD_FISICA}


class RequisitoDocumentacion(ModeloBase):
    """Define, por tipo de documento, si es obligatorio para todo el personal."""

    __tablename__ = "requisitos_documentacion"

    tipo: Mapped[TipoDocumentacion] = mapped_column(
        Enum(TipoDocumentacion, values_callable=lambda x: [e.value for e in x]),
        primary_key=True,
    )
    obligatorio: Mapped[bool] = mapped_column(Boolean, default=False)
    dias_aviso_previo: Mapped[int] = mapped_column(Integer, default=15)
