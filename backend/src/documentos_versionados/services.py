import logging
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, insert, func, update, desc

from src.documentos_versionados.models import DocumentoVersionado
from src.asociaciones.version_documento import version_documento, EstadoVersionDocumento
from src.documentos_versionados.constants import TipoDocumentoVersionado
from src.documentos_versionados import schemas, exceptions
from src.empleados.models import Empleado
from src.archivos.constants import CARACTERES_MAXIMOS, PREFIJOS_VALIDOS

logger = logging.getLogger(__name__)

def validar_version_documento(version_documento_url: str) -> None:
    if not version_documento_url.startswith(PREFIJOS_VALIDOS):
        raise exceptions.VersionDocumentoFormatoInvalido()

    if len(version_documento_url) > CARACTERES_MAXIMOS:
        raise exceptions.VersionDocumentoDemasiadoGrande()



def obtener_version_vigente(db:Session, documento_versionado_id: int):
    fila = db.execute(
        select(version_documento).where(
            version_documento.c.documentos_versionados_id == documento_versionado_id,
            version_documento.c.estado == EstadoVersionDocumento.ACTIVO,
        )
    ).mappings().first()

    if not fila:
        return None
    subido_por = None
    if fila.get("subido_por_id"):
        subido_por = db.scalar(select(Empleado).where(Empleado.id == fila["subido_por_id"]))
    return schemas.VersionDocumento(
        documentos_versionados_id=fila["documentos_versionados_id"],
        version_documento_url=fila["version_documento_url"],
        version=fila["version"],
        estado=fila["estado"].value if hasattr(fila["estado"], "value") else str(fila["estado"]),
        fecha_vigencia=fila.get("fecha_vigencia"),
        fecha_subida=fila.get("fecha_subida"),
        subido_por_id=fila.get("subido_por_id"),
        subido_por=schemas.EmpleadoResumen.model_validate(subido_por) if subido_por else None,
        archivo_nombre=fila.get("archivo_nombre"),
    )



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
    docs = db.scalars(select(DocumentoVersionado)).all()

    resultado = []
    for d in docs:
        vigente = obtener_version_vigente(db, d.id)
        resultado.append(
            schemas.DocumentoVersionado(
                id=d.id,
                nombre=d.nombre,
                tipo=d.tipo,
                #version_vigente=vigente,
            )
        )
    return resultado

def crear_documento_versionado(db: Session, documento_versionado: schemas.DocumentoVersionadoCreate,
    subido_por_id: Optional[int] = None,) -> schemas.DocumentoVersionado:
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
    fecha_v = documento_versionado.fecha_vigencia or date.today()
    fecha_s = datetime.now()
    id_autor = subido_por_id if subido_por_id is not None else documento_versionado.subido_por_id
    db.execute(
        insert(version_documento).values(
            documentos_versionados_id=_documentoversionado.id,
            version=1,
            estado=EstadoVersionDocumento.ACTIVO,
            version_documento_url=documento_versionado.version_inicial_url,
            fecha_vigencia=fecha_v,
            fecha_subida=fecha_s,
            subido_por_id=id_autor,
            archivo_nombre=documento_versionado.archivo_nombre,
        )
    )
    db.commit()
    db.refresh(_documentoversionado)
    
    vigente = obtener_version_vigente(db, _documentoversionado.id)
    return schemas.DocumentoVersionado(
        id=_documentoversionado.id,
        nombre=_documentoversionado.nombre,
        tipo=_documentoversionado.tipo,
        version_vigente=vigente,
    )

# Versiones de documento
def historial_de_versiones_documento_versionado(
    db: Session, documentos_versionados_id: int
) -> List[schemas.VersionDocumento]:
    doc_existe = buscar_documento_versionado_id(db, documentos_versionados_id)
    if doc_existe is None:
        raise exceptions.DocumentoVersionadoNoEncontrado()
    # Consulta con OUTERJOIN: trae la versión y el objeto Empleado en una sola ida a la BD
    stmt = (
        select(version_documento, Empleado)
        .outerjoin(Empleado, version_documento.c.subido_por_id == Empleado.id)
        .where(version_documento.c.documentos_versionados_id == documentos_versionados_id)
        .order_by(
            desc(version_documento.c.fecha_vigencia),
            desc(version_documento.c.version),
        )
    )
    filas = db.execute(stmt).all()
    resultado = []
    for fila in filas:
        # fila contiene tanto los campos de version_documento como el modelo Empleado
        emp = fila.Empleado
        subido_por = schemas.EmpleadoResumen.model_validate(emp) if emp else None
        resultado.append(
            schemas.VersionDocumento(
                documentos_versionados_id=fila.documentos_versionados_id,
                version_documento_url=fila.version_documento_url,
                version=fila.version,
                estado=fila.estado.value if hasattr(fila.estado, "value") else str(fila.estado),
                fecha_vigencia=fila.fecha_vigencia,
                fecha_subida=fila.fecha_subida,
                subido_por_id=fila.subido_por_id,
                subido_por=subido_por,
                archivo_nombre=fila.archivo_nombre,
            )
        )
    return resultado

def subir_nueva_version_documento(db:Session, nueva_version_documento: schemas.VersionDocumentoCreate, subido_por_id: Optional[int] = None,) -> schemas.VersionDocumento:
    if nueva_version_documento.documentos_versionados_id is None:
        raise exceptions.IdDocumentoVersionadoRequerido()
    DOCUMENTO_VERSIONADO_EXISTE = buscar_documento_versionado_id(db,nueva_version_documento.documentos_versionados_id)
    if DOCUMENTO_VERSIONADO_EXISTE is None:
        raise exceptions.DocumentoVersionadoNoEncontrado()
    
    validar_version_documento(nueva_version_documento.version_documento_url)
    
    archivar_version_activa(db, nueva_version_documento.documentos_versionados_id)
    nueva_version=obtener_numero_nueva_version(db, nueva_version_documento.documentos_versionados_id)
    fecha_v = nueva_version_documento.fecha_vigencia or date.today()
    fecha_s = datetime.now()
    id_autor = subido_por_id if subido_por_id is not None else nueva_version_documento.subido_por_id
    db.execute(
        insert(version_documento).values(
            documentos_versionados_id=nueva_version_documento.documentos_versionados_id,
            version=nueva_version,
            estado=EstadoVersionDocumento.ACTIVO,
            version_documento_url=nueva_version_documento.version_documento_url,
            fecha_vigencia=fecha_v,
            fecha_subida=fecha_s,
            subido_por_id=id_autor,
            archivo_nombre=nueva_version_documento.archivo_nombre,
        )
    )
    db.commit()
    subido_por = None
    if id_autor:
        subido_por = db.scalar(
            select(Empleado).where(Empleado.id == id_autor)
        )
    return schemas.VersionDocumento(
        documentos_versionados_id=nueva_version_documento.documentos_versionados_id,
        version=nueva_version,
        estado="activo",
        version_documento_url=nueva_version_documento.version_documento_url,
        fecha_vigencia=fecha_v,
        fecha_subida=fecha_s,
        subido_por_id=id_autor,
        subido_por=schemas.EmpleadoResumen.model_validate(subido_por) if subido_por else None,
        archivo_nombre=nueva_version_documento.archivo_nombre,
    )

    
