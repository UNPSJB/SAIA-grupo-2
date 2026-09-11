from sqlalchemy import Table, Column, ForeignKey
from src.models import ModeloBase

empleado_capacidad = Table(
    "empleado_capacidad",
    ModeloBase.metadata,
    Column(
        "empleado_id", 
        ForeignKey("empleados.id", ondelete="CASCADE"), 
        primary_key=True
    ),
    Column(
        "capacidad_id", 
        ForeignKey("capacidades.id", ondelete="CASCADE"), 
        primary_key=True
    )
)