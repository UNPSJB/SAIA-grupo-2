import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import select
from src.database import get_db
from src.documentos_versionados import schemas, services
from src.documentos_versionados.exceptions import PermisoDenegadoAdmin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documentos-versionados", tags=["documentos-versionados"])
router_documentos = APIRouter(prefix="/documentos", tags=["documentos"])

def verificar_rol_admin(x_user_role: Optional[str] = Header(None, alias="X-User-Role")):
    """Valida que la petición incluya la cabecera de rol de administrador."""
    if not x_user_role or x_user_role.lower() != "admin":
        raise PermisoDenegadoAdmin()

    
# --- Gestión general de documentos versionados (CRUD básico) ---
@router.get("/", response_model=list[schemas.DocumentoVersionado])
def listar_documentos_versionados(db: Annotated[Session, Depends(get_db)]):
    return services.listar_documentos_versionados(db)

@router.post("/", response_model=schemas.DocumentoVersionado)
def crear_documento_versionado(
    documento_versionado: schemas.DocumentoVersionadoCreate,
    db: Annotated[Session, Depends(get_db)],
):
    return services.crear_documento_versionado(db, documento_versionado)

@router.post("/{documentos_versionados_id}", response_model=schemas.VersionDocumento)
def subir_nueva_version_documento(
    version_documento: schemas.VersionDocumentoCreate,
    db: Annotated[Session, Depends(get_db)],
):
    return services.subir_nueva_version_documento(db, version_documento)

# Consultar historial de versiones 

@router_documentos.get(
    "/{id}/versiones",
    response_model=list[schemas.VersionDocumento],
    dependencies=[Depends(verificar_rol_admin)],
    summary="Consultar historial de versiones de un documento (Solo Administrador)",
)
def read_versiones_documento(
    id: int,
    db: Annotated[Session, Depends(get_db)],
):
    return services.historial_de_versiones_documento_versionado(db, id)