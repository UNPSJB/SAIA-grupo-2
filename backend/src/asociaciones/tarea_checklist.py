from enum import Enum
from sqlalchemy import Table, Column, ForeignKey, Enum as SQLEnum
from src.models import ModeloBase


class EstadoTareaChecklist(str, Enum):
    PENDIENTE = "pendiente"
    COMPLETADA = "completada"


tarea_checklist = Table(
    "tarea_checklist",
    ModeloBase.metadata,
    Column(
        "tarea_id",
        ForeignKey("tareas.id", ondelete="CASCADE"),
        primary_key=True
    ),
    Column(
        "checklist_id",
        ForeignKey("checklists.id", ondelete="CASCADE"),
        primary_key=True
    ),
    Column(
        "estado",
        SQLEnum(
            EstadoTareaChecklist,
            values_callable=lambda x: [e.value for e in x],
            create_constraint=True,
        ),
        nullable=False,
        default=EstadoTareaChecklist.PENDIENTE,
    ),
    Column(
        "responsable_id",
        ForeignKey("empleados.id"),
    )
)