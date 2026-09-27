from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Mapped, mapped_column

from src.elementos_limpieza.constants import DIAS_AVISO_PREVIO, EstadoRecambio
from src.models import ModeloBase


class ElementoLimpieza(ModeloBase):
    __tablename__ = "elementos_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    frecuencia_recambio_dias: Mapped[Optional[int]] = mapped_column(default=None)
    fecha_ultimo_recambio: Mapped[date] = mapped_column(default=date.today)

    @property
    def fecha_proximo_recambio(self) -> Optional[date]:
        if self.frecuencia_recambio_dias is None:
            return None
        return self.fecha_ultimo_recambio + timedelta(days=self.frecuencia_recambio_dias)

    @property
    def dias_restantes(self) -> Optional[int]:
        proxima = self.fecha_proximo_recambio
        if proxima is None:
            return None
        return (proxima - date.today()).days

    @property
    def estado_recambio(self) -> EstadoRecambio:
        proxima = self.fecha_proximo_recambio
        if proxima is None:
            return EstadoRecambio.SIN_CONTROL

        hoy = date.today()
        if proxima <= hoy:
            return EstadoRecambio.VENCIDO
        if proxima <= hoy + timedelta(days=DIAS_AVISO_PREVIO):
            return EstadoRecambio.PROXIMO
        return EstadoRecambio.VIGENTE
