from sqlalchemy import Table, Column, Integer, ForeignKey
from src.models import ModeloBase

empleado_sector = Table(
    "empleado_sector",
    ModeloBase.metadata,
    Column("empleado_id", Integer, ForeignKey("empleados.id", ondelete="CASCADE"), primary_key=True),
    Column("sector_id", Integer, ForeignKey("sectores.id", ondelete="CASCADE"), primary_key=True)
)