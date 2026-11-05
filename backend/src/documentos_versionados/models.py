from typing import Optional

from sqlalchemy import Integer, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from src.models import ModeloBase
from src.documentos_versionados.constants import TipoDocumentoVersionado



class DocumentoVersionado(ModeloBase):
    __tablename__="documentos_versionados"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    tipo: Mapped[TipoDocumentoVersionado] = mapped_column(
        SQLEnum(
            TipoDocumentoVersionado,
            values_callable=lambda x: [e.value for e in x],
            create_constraint=True,
        )
    )