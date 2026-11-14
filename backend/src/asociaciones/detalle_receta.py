from sqlalchemy import ForeignKeyConstraint, Integer, Table, Column, ForeignKey, Float, Enum as SQLEnum

from src.models import ModeloBase
from src.recetas.constants import TipoUsoInsumo

detalle_receta = Table(
    "detalle_receta",
    ModeloBase.metadata,
    Column("documento_id", Integer, primary_key=True, nullable=False),
    Column("version", Integer, primary_key=True, nullable=False),
    ForeignKeyConstraint(
        ["documento_id","version"],
        ["version_receta.documento_id","version_receta.version"],
        ondelete="RESTRICT"
    ),
    Column(
        "renglon",
        Integer,
        primary_key=True,
        nullable=False
    ),


    Column(
        "insumo_id",
        ForeignKey("insumos.id", ondelete="RESTRICT"),
        nullable=False
    ),
    Column(
        "cantidad_gramos",
        Float,
        nullable=False
    ),
    Column(
        "tipo_uso",
        SQLEnum(
            TipoUsoInsumo,
            values_callable=lambda x: [e.value for e in x],
            create_constraint=True,
        ),
        nullable=False
    ),
    Column(
        "aditivo_id",
        ForeignKey("aditivos.id", ondelete="RESTRICT"),
        nullable=True
    )
)