from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_medida.id"))
    
    # Referenciamos UnidadMedida mediante string para evitar dependencias circulares
    unidad_medida: Mapped["src.unidades_medida.models.UnidadMedida"] = relationship(
        "src.unidades_medida.models.UnidadMedida"
    )