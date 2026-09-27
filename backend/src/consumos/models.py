from datetime import date
from sqlalchemy import ForeignKey, Float, String, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class ConsumoLimpieza(ModeloBase):
    __tablename__ = "consumos_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_limpieza_id: Mapped[int] = mapped_column(ForeignKey("productos_limpieza.id"), index=True)
    cantidad_consumida: Mapped[float] = mapped_column(Float)
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas.id"), index=True)
    fecha_registro: Mapped[date] = mapped_column(Date, default=date.today)

    producto_limpieza: Mapped["src.productos_limpieza.models.ProductoLimpieza"] = relationship(
        "src.productos_limpieza.models.ProductoLimpieza"
    )
    tarea: Mapped["src.tareas.models.Tarea"] = relationship(
        "src.tareas.models.Tarea"
    
    )