from sqlalchemy import Table, Column, ForeignKey, Float
from src.models import ModeloBase

consumos_reales = Table(
    "consumos_reales",
    ModeloBase.metadata,
    Column(
        "id",
        Float,
        primary_key=True
    ),
    Column(
        "checklist_id",
        ForeignKey("checklists.id", ondelete="CASCADE"),
        nullable=False
    ),
    Column(
        "producto_limpieza_id",
        ForeignKey("productos_limpieza.id", ondelete="CASCADE"),
        nullable=False
    ),
    Column(
        "cantidad",
        Float,
        nullable=False
    )
)
