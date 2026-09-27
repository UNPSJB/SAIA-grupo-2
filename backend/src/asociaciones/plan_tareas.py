from sqlalchemy import Table, Column, ForeignKey
from src.models import ModeloBase

plan_tarea = Table(
    "plan_tarea",
    ModeloBase.metadata,
    Column(
        "plan_id", 
        ForeignKey("planes.id", ondelete="CASCADE"), 
        primary_key=True
    ),
    Column(
        "tarea_id", 
        ForeignKey("tareas.id", ondelete="CASCADE"), 
        primary_key=True
    )
)