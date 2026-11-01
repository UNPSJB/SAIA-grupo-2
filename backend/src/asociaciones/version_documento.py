from enum import Enum
from datetime import date, datetime
from sqlalchemy import Table, Column, ForeignKey, Text, Integer, Date, DateTime, String, Index, Enum as SQLEnum
from src.models import ModeloBase

class EstadoVersionDocumento(str,Enum):
    ACTIVO = "activo"
    ARCHIVADO ="archivado"

version_documento = Table(
    "version_documento",
    ModeloBase.metadata,
    Column(
        "documentos_versionados_id",
        ForeignKey("documentos_versionados.id",ondelete="RESTRICT"), #habria que implementar borrado logico pero de momento lo dejo asi
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


    # campos para saber quien modifico
    Column(
        "modificado_por_id",
        ForeignKey("empleados.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column(
        "fecha_modificacion",
        DateTime,
        nullable=True,
    ),
    Column(
        "archivo_nombre",
        String(255),
        nullable=True,
    ),

   
)
 #garantiza una sola version vigente en base de datos

Index(
    "idx_version_documento_unica_activa",
    version_documento.c.documentos_versionados_id,
    unique=True,
    sqlite_where=version_documento.c.estado == EstadoVersionDocumento.ACTIVO,
    postgresql_where=version_documento.c.estado == EstadoVersionDocumento.ACTIVO,
)