from datetime import date
from enum import Enum


class EstadoVencimiento(str, Enum):
    VENCIDO = "vencido"
    PROXIMO = "proximo"
    VIGENTE = "vigente"


class ControlDeVencimiento:
    """Aporta el calculo de estado a cualquier entidad que tenga fecha_vencimiento.

    La entidad que hereda debe definir una columna fecha_vencimiento de tipo date.
    El umbral sale de dias_aviso_previo, que por defecto lee la constante de clase.
    Una subclase puede pisar esa property para tomarlo de otro lado, por ejemplo
    de una tabla de parametros.
    """

    DIAS_AVISO_PREVIO = 15

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
