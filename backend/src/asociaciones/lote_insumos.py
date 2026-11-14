from sqlalchemy import Table, Column, ForeignKey, Float
from src.models import ModeloBase
# Tabla intermedia para asociar insumos y la cantidad que se uso en un lote
lote_insumo = Table(
    "lotes_insumos",
    ModeloBase.metadata,
    Column(
        "lote_id",
        ForeignKey("lotes_produccion.nro_lote", ondelete="CASCADE"), 
        primary_key=True
    ),
    Column(
        "insumo_id",
        ForeignKey("insumos.id", ondelete="CASCADE"),
        primary_key=True
    ),
    Column(
        "cantidad_utilizada",
        Float,
        nullable=False
    ),
    Column(
        "unidad_medida_id",
        ForeignKey("unidades_medida.id"),
        nullable=False
    )
)