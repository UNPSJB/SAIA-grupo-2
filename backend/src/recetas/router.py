import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import select
from src.database import get_db
from src.recetas import schemas, services
from src.recetas.exceptions import PermisoDenegadoAdmin


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recetas", tags=["recetas"])

def verificar_rol_admin(x_user_role: Optional[str] = Header(None, alias="X-User-Role")):
    """Valida que la petición incluya la cabecera de rol de administrador."""
    if not x_user_role or x_user_role.lower() != "admin":
        raise PermisoDenegadoAdmin()

def verificar_acceso_operario_o_admin(x_user_role: Optional[str] = Header(None, alias="X-User-Role")):
    """Permite el acceso a roles operario y admin para lectura de recetas."""
    if not x_user_role or x_user_role.lower() not in ("operario", "admin"):
        raise PermisoDenegadoAdmin()



# --- Gestion de versiones de receta ---

@router.get(
    "/{receta_id}/versiones/vigente",
    response_model=schemas.VersionReceta
)
def obtener_version_vigente(
    receta_id:int,
    db:Annotated[Session, Depends(get_db)]
):
    return services.obtener_version_vigente(db,receta_id)

@router.get(
    "/{receta_id}/versiones",
    response_model = list[schemas.VersionReceta]
)
def listar_versiones_de_receta(
    receta_id:int,
    db:Annotated[Session, Depends(get_db)]
):
    return services.listar_versiones_de_receta(db,receta_id)


@router.post(
    "/{receta_id}/versiones",
    response_model=schemas.VersionReceta,
    dependencies=[Depends(verificar_rol_admin)],
    summary="Crear version de receta (Solo Administrador)"
)
def crear_version_receta(
    receta_id:int,
    version_receta: schemas.VersionRecetaCreate,
    db:Annotated[Session, Depends(get_db)]
):
    return services.crear_version_receta(db,receta_id,version_receta)


@router.get(
    "/{receta_id}/versiones/{nro_version}",
    response_model=schemas.VersionReceta
)
def leer_version_receta(
    receta_id:int,
    nro_version:int,
    db:Annotated[Session, Depends(get_db)]
):
    return services.leer_version_receta(db,receta_id,nro_version)


@router.put(
    "/{receta_id}/versiones/{nro_version}/vigencia",
    response_model=schemas.VersionReceta,
    dependencies=[Depends(verificar_rol_admin)],
    summary="Marcar version de receta como vigente (Solo Administrador)"
)
def marcar_version_receta_vigente(
    receta_id:int,
    nro_version:int,
    db: Annotated[Session, Depends(get_db)]
):
    return services.marcar_version_receta_vigente(db,receta_id,nro_version)

# --- Gestion de recetas ---
@router.get("/", response_model=list[schemas.Receta])
def listar_recetas(db:Annotated[Session, Depends(get_db)]):
    return services.listar_Recetas(db)

@router.get("/{receta_id}", response_model=schemas.Receta)
def leer_receta(
    receta_id: int,
    db:Annotated[Session, Depends(get_db)] 
):
    return services.leer_receta(db, receta_id)

@router.post(
    "/",
    response_model=schemas.Receta,
    dependencies=[Depends(verificar_rol_admin)],
    summary="Crear receta (Solo Administrador)"
)
def crear_receta(
    receta: schemas.RecetaCreate,
    db:Annotated[Session, Depends(get_db)]
):
    return services.crear_receta(db,receta)
