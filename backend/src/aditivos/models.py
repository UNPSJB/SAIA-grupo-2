from typing import Optional

from sqlalchemy import ForeignKey, Integer, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from src.models import ModeloBase

class ClaseFuncionalAditivo(ModeloBase):
    __tablename__="clases_funcionales_aditivos"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True, unique=True)
    necesita_ins: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Aditivo(ModeloBase):
    __tablename__="aditivos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre_completo: Mapped[str] = mapped_column(index=True)
    clase_funcional: Mapped[int] = mapped_column(
        ForeignKey("clases_funcionales_aditivos.id"),
        nullable=False
    )
    numero_ins: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)