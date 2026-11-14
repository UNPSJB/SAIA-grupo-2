from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase

FIN_DEL_DIA = time(23, 59, 59)


class LoteProduccion(ModeloBase):
    """Registro simple de una tanda producida: que producto, cuando y cuanto.

    El lote nace abierto y su consumo de insumos se puede corregir hasta que se cierra, a mano
    o automaticamente al terminar el dia en que se registro. Cerrado, queda de solo lectura.
    """

    __tablename__ = "lotes_produccion"

    nro_lote: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), index=True)
    fecha: Mapped[date] = mapped_column(index=True)
    cantidad: Mapped[float]
    fecha_registro: Mapped[datetime] = mapped_column(default=datetime.now)
    fecha_cierre: Mapped[Optional[datetime]]
    cerrado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empleados.id"))

    producto: Mapped["src.productos.models.Producto"] = relationship(
        "src.productos.models.Producto", lazy="selectin"
    )
    cerrado_por: Mapped[Optional["src.empleados.models.Empleado"]] = relationship(
        "src.empleados.models.Empleado", lazy="selectin"
    )

    @property
    def cierre_automatico(self) -> datetime:
        return datetime.combine(self.fecha_registro.date(), FIN_DEL_DIA)

    @property
    def cerrado(self) -> bool:
        return self.fecha_cierre is not None or self.fecha_registro.date() < date.today()

    @property
    def fecha_cierre_efectiva(self) -> Optional[datetime]:
        if self.fecha_cierre is not None:
            return self.fecha_cierre
        return self.cierre_automatico if self.cerrado else None
