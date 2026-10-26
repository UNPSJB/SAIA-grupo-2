import logging

from typing import List, Optional

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, insert, func, update

from src.documentos_versionados.models import DocumentoVersionado
from src.asociaciones.version_documento import version_documento, EstadoVersionDocumento
from src.documentos_versionados.constants import TipoDocumentoVersionado
from src.documentos_versionados import schemas, exceptions
from src.archivos.constants import CARACTERES_MAXIMOS, PREFIJOS_VALIDOS

logger = logging.getLogger(__name__)

def validar_version_documento(version_documento_url: str) -> None:
    if not version_documento_url.startswith(PREFIJOS_VALIDOS):
        raise exceptions.VersionDocumentoFormatoInvalido()

    if len(version_documento_url) > CARACTERES_MAXIMOS:
        raise exceptions.VersionDocumentoDemasiadoGrande()

def obtener_version_vigente(db:Session, documento_versionado_id: int):
    return db.execute(
        select(version_documento).where(
            version_documento.c.documentos_versionados_id == documento_versionado_id,
            version_documento.c.estado == EstadoVersionDocumento.ACTIVO,
        )
    ).mappings().first()

def obtener_numero_nueva_version(db: Session, documento_versionado_id:int) -> int:
    ULTIMA_VERSION=db.scalar( 
        select(
            func.max(version_documento.c.version)
        ).where(
            version_documento.c.documentos_versionados_id == documento_versionado_id        
        )
    )
    # Teoricamente NO deberian haber casos donde no hayan versiones para un documento versionado, 
    # ...pero yo le temo al caso de que un usuario en un avion acceda a la API desde una heladera inteligente en chino
    nueva_version = 1 if ULTIMA_VERSION is None else ULTIMA_VERSION + 1
    return nueva_version

def archivar_version_activa(db:Session, documento_versionado_id:int) -> None:
    db.execute(
        update(version_documento)
        .where(
            version_documento.c.documentos_versionados_id == documento_versionado_id,
            version_documento.c.estado == EstadoVersionDocumento.ACTIVO          
        ).values(
            estado=EstadoVersionDocumento.ARCHIVADO
        )
    )

# Para duplicado 
def buscar_documento_versionado_nombre(db: Session, documento_versionado_nombre:str) -> Optional[DocumentoVersionado]:
    return db.scalar(
        select(DocumentoVersionado)
        .where(DocumentoVersionado.nombre == documento_versionado_nombre)
    )
# Para verif existencia
def buscar_documento_versionado_id(db: Session, documentos_versionados_id:int) -> Optional[DocumentoVersionado]:
    return db.scalar(
        select(DocumentoVersionado)
        .where(DocumentoVersionado.id == documentos_versionados_id)
    )

# DOCUMENTOS VERSIONADOS
def listar_documentos_versionados(db: Session) -> List [schemas.DocumentoVersionado]:
    logger.info ("Listando documentos versionados desde services")
    return db.scalars(select(DocumentoVersionado)).all()

def crear_documento_versionado(db: Session, documento_versionado: schemas.DocumentoVersionadoCreate) -> schemas.DocumentoVersionado:
    _documentoversionado = DocumentoVersionado(**documento_versionado.model_dump(exclude={"version_inicial_url"}))

    if _documentoversionado.tipo is None:
        raise exceptions.TipoRequerido()
    TIPO_EXISTENTE = _documentoversionado.tipo in TipoDocumentoVersionado
    if not TIPO_EXISTENTE:
        raise exceptions.TipoInvalido()
    
    if _documentoversionado.nombre is None:
        raise exceptions.NombreRequerido()
    DOCUMENTO_VERSIONADO_DUPLICADO = buscar_documento_versionado_nombre(db, _documentoversionado.nombre)
    if DOCUMENTO_VERSIONADO_DUPLICADO is not None:
        raise exceptions.DocumentoVersionadoDuplicado()

    validar_version_documento(documento_versionado.version_inicial_url)    
    db.add(_documentoversionado)
    db.flush() # Con esto obtengo temporalmente el ID del doc sin tener que hacer un commit
    db.execute( # Al ser tabla, solo puedo agregar mediante inserts (en vez de add con variable _versioninicial)
        insert(version_documento).values(
            documentos_versionados_id=_documentoversionado.id,
            version=1,
            estado=EstadoVersionDocumento.ACTIVO,
            version_documento_url=documento_versionado.version_inicial_url
        )
    )
    db.commit()
    db.refresh(_documentoversionado)
    return(_documentoversionado)

# Versiones de documento
def historial_de_versiones_documento_versionado(db: Session, documentos_versionados_id: int) -> List[schemas.VersionDocumento]:
    DOCUMENTO_VERSIONADO_EXISTE = buscar_documento_versionado_id(db, documentos_versionados_id)
    if DOCUMENTO_VERSIONADO_EXISTE is None:
        raise exceptions.DocumentoVersionadoNoEncontrado()

    filas = db.execute(
        select(
            version_documento.c.documentos_versionados_id,
            version_documento.c.version,
            version_documento.c.version_documento_url,
        ).where(
            version_documento.c.documentos_versionados_id == documentos_versionados_id
        ).order_by(
            version_documento.c.version
        )
    ).mappings().all()

    return [
        schemas.VersionDocumento.model_validate(fila)
        for fila in filas
    ]

def subir_nueva_version_documento(db:Session, nueva_version_documento: schemas.VersionDocumentoCreate) -> schemas.VersionDocumento:
    if nueva_version_documento.documentos_versionados_id is None:
        raise exceptions.IdDocumentoVersionadoRequerido()
    DOCUMENTO_VERSIONADO_EXISTE = buscar_documento_versionado_id(db,nueva_version_documento.documentos_versionados_id)
    if DOCUMENTO_VERSIONADO_EXISTE is None:
        raise exceptions.DocumentoVersionadoNoEncontrado()
    
    validar_version_documento(nueva_version_documento.version_documento_url)
    
    archivar_version_activa(db, nueva_version_documento.documentos_versionados_id)
    nueva_version=obtener_numero_nueva_version(db, nueva_version_documento.documentos_versionados_id)
    db.execute(
        insert(version_documento).values(
            documentos_versionados_id=nueva_version_documento.documentos_versionados_id,
            version=nueva_version,
            estado=EstadoVersionDocumento.ACTIVO,
            version_documento_url=nueva_version_documento.version_documento_url
        )
    )
    db.commit()
    return schemas.VersionDocumento(
        documentos_versionados_id=nueva_version_documento.documentos_versionados_id,
        version=nueva_version,
        version_documento_url=nueva_version_documento.version_documento_url,
    )

    
