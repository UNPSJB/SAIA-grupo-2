from typing import List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class UnidadMedida(ModeloBase):
    __tablename__ = "unidades_medida"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(unique=True, index=True)
    
