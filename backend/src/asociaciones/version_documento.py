from enum import Enum
from datetime import date, datetime
from sqlalchemy import Table, Column, ForeignKey, Text, Integer, Date, DateTime, String, Enum as SQLEnum
from src.models import ModeloBase

class EstadoVersionDocumento(str,Enum):
    ACTIVO = "activo"
    ARCHIVADO ="archivado"

version_documento = Table(
    "version_documento",
    ModeloBase.metadata,
    Column(
        "documentos_versionados_id",
        ForeignKey("documentos_versionados.id",ondelete="RESTRICT"),
        primary_key=True,
        index = True
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
    ),
     Column(
        "fecha_vigencia",
        Date,
        nullable=True,
        default=date.today,
    ),
    Column(
        "fecha_subida",
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    ),
    Column(
        "subido_por_id",
        ForeignKey("empleados.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column(
        "archivo_nombre",
        String(255),
        nullable=True,
    ),
)