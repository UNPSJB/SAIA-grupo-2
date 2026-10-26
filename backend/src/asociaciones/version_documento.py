from enum import Enum
from sqlalchemy import Table, Column, ForeignKey, Text, Integer, Enum as SQLEnum
from src.models import ModeloBase

class EstadoVersionDocumento(str,Enum):
    ACTIVO = "activo"
    ARCHIVADO ="archivado"

version_documento = Table(
    "version_documento",
    ModeloBase.metadata,
    Column(
        "documentos_versionados_id",
        ForeignKey("documentos_versionados.id",ondelete="CASCADE"),
        primary_key=True
    ),
    Column( 
        "version", 
        Integer,
        primary_key=True
    ),
    Column(
        "estado",
        SQLEnum(
            EstadoVersionDocumento,
            values_callable=lambda x: [e.value for e in x],
            create_constraint=True,
        ),
        nullable=False,
        default=EstadoVersionDocumento.ACTIVO,
    ),
    Column(
        "version_documento_url",
        Text, 
        nullable=False
    )
)