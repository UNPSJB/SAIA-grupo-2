from sqlalchemy import Table, Column, ForeignKey
from src.models import ModeloBase

plan_equipo = Table(
    "plan_equipo",
    ModeloBase.metadata,
    Column(
        "plan_id",
        ForeignKey("planes.id", ondelete="CASCADE"),
        primary_key=True
    ),
    Column(
        "equipo_id",
        ForeignKey("equipos.id", ondelete="CASCADE"),
        primary_key=True
    )
)
