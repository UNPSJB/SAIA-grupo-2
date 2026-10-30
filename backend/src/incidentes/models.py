from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.incidentes.constants import EstadoIncidente, TipoIncidente, TipoMovimiento
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.empleados.models import Empleado


def ahora() -> datetime:
    return datetime.now(timezone.utc)


class Incidente(ModeloBase):
    """Incidente reportado en planta. El cierre se completa en la HU de accion correctiva."""

    __tablename__ = "incidentes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    descripcion: Mapped[str] = mapped_column(Text)
    tipo: Mapped[TipoIncidente] = mapped_column(
        Enum(TipoIncidente, values_callable=lambda x: [e.value for e in x]),
        default=TipoIncidente.OTRO,
        index=True,
    )
    estado: Mapped[EstadoIncidente] = mapped_column(
        Enum(EstadoIncidente, values_callable=lambda x: [e.value for e in x]),
        default=EstadoIncidente.ABIERTO,
        index=True,
    )

    fecha_hora_reporte: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=ahora, index=True
    )
    empleado_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"), index=True)

    archivo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    archivo_nombre: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    accion_correctiva: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_cierre: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    responsable_cierre_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("empleados.id"), nullable=True
    )

    empleado: Mapped["Empleado"] = relationship(
        "Empleado", foreign_keys=[empleado_id], lazy="joined"
    )
    responsable_cierre: Mapped[Optional["Empleado"]] = relationship(
        "Empleado", foreign_keys=[responsable_cierre_id], lazy="joined"
    )

    movimientos: Mapped[list["MovimientoIncidente"]] = relationship(
        "MovimientoIncidente",
        back_populates="incidente",
        order_by="MovimientoIncidente.fecha_hora, MovimientoIncidente.id",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def dias_abierto(self) -> Optional[int]:
        """Antiguedad en dias mientras el incidente sigue abierto."""
        if self.estado != EstadoIncidente.ABIERTO or self.fecha_hora_reporte is None:
            return None

        reportado = self.fecha_hora_reporte
        if reportado.tzinfo is None:
            reportado = reportado.replace(tzinfo=timezone.utc)
        return (ahora() - reportado).days


class MovimientoIncidente(ModeloBase):
    """Cada cierre y cada reapertura del incidente, sin limite de ciclos."""

    __tablename__ = "movimientos_incidente"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incidente_id: Mapped[int] = mapped_column(ForeignKey("incidentes.id"), index=True)
    tipo: Mapped[TipoMovimiento] = mapped_column(
        Enum(TipoMovimiento, values_callable=lambda x: [e.value for e in x])
    )
    descripcion: Mapped[str] = mapped_column(Text)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    empleado_id: Mapped[int] = mapped_column(ForeignKey("empleados.id"), index=True)

    incidente: Mapped["Incidente"] = relationship("Incidente", back_populates="movimientos")
    empleado: Mapped["Empleado"] = relationship("Empleado", lazy="joined")
