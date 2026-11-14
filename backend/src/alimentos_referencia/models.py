from typing import Optional

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.models import ModeloBase
from src.unidades_medida.constants import MagnitudUnidad


class AlimentoReferencia(ModeloBase):
    """Alimento de la base de composicion de referencia (SARA), con sus valores cada 100 g o 100 ml.

    Los valores salen del CSV del servicio de SARA; los azucares y las grasas trans, que el CSV
    no trae, se completan con la tabla SARA 2 (PDF) y nombre_en_pdf indica de que fila salieron.
    Cada columna de nutriente se llama igual que el valor del enum Nutriente, para poder
    leerlas de forma generica. Un valor nulo significa que la base no informa ese dato.
    """

    __tablename__ = "alimentos_referencia"

    codigo: Mapped[str] = mapped_column(String(10), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200))
    nombre_busqueda: Mapped[str] = mapped_column(String(200), index=True)
    magnitud: Mapped[MagnitudUnidad] = mapped_column(
        SQLEnum(MagnitudUnidad, values_callable=lambda x: [e.value for e in x], create_constraint=True)
    )
    nombre_en_pdf: Mapped[Optional[str]] = mapped_column(String(300))

    energia: Mapped[Optional[float]]
    carbohidratos: Mapped[Optional[float]]
    azucares_totales: Mapped[Optional[float]]
    azucares_anadidos: Mapped[Optional[float]]
    proteinas: Mapped[Optional[float]]
    grasas_totales: Mapped[Optional[float]]
    grasas_saturadas: Mapped[Optional[float]]
    grasas_trans: Mapped[Optional[float]]
    fibra_alimentaria: Mapped[Optional[float]]
    sodio: Mapped[Optional[float]]
