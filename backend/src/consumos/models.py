from datetime import date
from sqlalchemy import ForeignKey, Float, String, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class ConsumoLimpieza(ModeloBase):
    __tablename__ = "consumos_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), index=True)
    cantidad_consumida: Mapped[float] = mapped_column(Float)
    tarea_asociada: Mapped[str] = mapped_column(String(150))
    fecha_registro: Mapped[date] = mapped_column(Date, default=date.today)

    insumo: Mapped["src.insumos.models.Insumo"] = relationship(
        "src.insumos.models.Insumo"
    )