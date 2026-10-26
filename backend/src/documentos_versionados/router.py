import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Annotated
from src.database import get_db

from src.documentos_versionados import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documentos-versionados",tags=["documentos-versionados"])

@router.get("/",response_model=list[schemas.DocumentoVersionado])
def listar_documentos_versionados (db: Annotated[Session, Depends(get_db)]):
    return services.listar_documentos_versionados(db)

@router.post("/",response_model=schemas.DocumentoVersionado)
def crear_documento_versionado(documento_versionado:schemas.DocumentoVersionadoCreate, db: Annotated[Session, Depends(get_db)]):
    return services.crear_documento_versionado(db, documento_versionado)

# Gestion de versiones
@router.get("/{documentos_versionados_id}", response_model=list[schemas.VersionDocumento])
def historial_de_versiones_documento_versionado(documentos_versionados_id:int, db: Annotated[Session, Depends(get_db)]):
    return services.historial_de_versiones_documento_versionado(db, documentos_versionados_id)

@router.post("/{documentos_versionados_id}", response_model=schemas.VersionDocumento)
def subir_nueva_version_documento(version_documento:schemas.VersionDocumentoCreate, db: Annotated[Session, Depends(get_db)]):
    return services.subir_nueva_version_documento(db, version_documento)