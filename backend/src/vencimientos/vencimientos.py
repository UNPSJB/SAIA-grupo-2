from datetime import date
from enum import Enum
from src.config import DIAS_AVISO_PREVIO


class EstadoVencimiento(str, Enum):
    VENCIDO = "vencido"
    PROXIMO = "proximo"
    VIGENTE = "vigente"


class ControlDeVencimiento:
    DIAS_AVISO_PREVIO = DIAS_AVISO_PREVIO

    @property
    def dias_aviso_previo(self) -> int:
        return self.DIAS_AVISO_PREVIO

    @property
    def dias_restantes(self) -> int:
        return (self.fecha_vencimiento - date.today()).days

    @property
    def estado(self) -> EstadoVencimiento:
        dias = self.dias_restantes
        if dias < 0:
            return EstadoVencimiento.VENCIDO
        if dias <= self.dias_aviso_previo:
            return EstadoVencimiento.PROXIMO
        return EstadoVencimiento.VIGENTE
