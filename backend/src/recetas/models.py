from typing import Optional

from sqlalchemy import ForeignKey, Integer, Boolean 
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.recetas.constants import TipoUsoInsumo


class Receta(ModeloBase):
    __tablename__="recetas"

    documento_id: Mapped[int] = mapped_column(ForeignKey("documentos_versionados.id"), primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False, index=True, unique=True)
    producto: Mapped["src.productos.models.Producto"] = relationship()


class VersionReceta(ModeloBase):
    __tablename__="version_receta"
    documento_id: Mapped[int] = mapped_column(ForeignKey("version_documento.documentos_versionados_id"), primary_key=True, index=True)
    version: Mapped[int] = mapped_column(ForeignKey("version_documento.version"), primary_key=True, index=True)

    rendimiento_final_gramos: Mapped[float] = mapped_column(nullable=False)
    unidad_venta: Mapped[float] = mapped_column(nullable=False)
    venta_unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_medida.id"), nullable=False) 

    