import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import select
from src.database import get_db
from src.aditivos import schemas, services
from src.aditivos.exceptions import PermisoDenegadoAdmin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/aditivos", tags=["aditivos"])
router_clases_funcionales = APIRouter(prefix="/clases-funcionales", tags=["clases-funcionales"])

def verificar_rol_admin(x_user_role: Optional[str] = Header(None, alias="X-User-Role")):
    """Valida que la petición incluya la cabecera de rol de administrador."""
    if not x_user_role or x_user_role.lower() != "admin":
        raise PermisoDenegadoAdmin()

def verificar_acceso_operario_o_admin(x_user_role: Optional[str] = Header(None, alias="X-User-Role")):
    """Permite el acceso a roles operario y admin para lectura de recetas."""
    if not x_user_role or x_user_role.lower() not in ("operario", "admin"):
        raise PermisoDenegadoAdmin()

# --- Gestion de clases funcionales ---
@router_clases_funcionales.get("/", response_model=list[schemas.ClaseFuncionalAditivo])
def listar_clases_funcionales_aditivos(db: Annotated[Session, Depends(get_db)]):
    return services.listar_clases_funcionales_aditivos(db)

@router_clases_funcionales.post("/", response_model=schemas.ClaseFuncionalAditivo)
def crear_clase_funcional_aditivo(
    clase_funcional: schemas.ClaseFuncionalAditivoCreate,
    db: Annotated[Session, Depends(get_db)],
):
    return services.crear_clase_funcional_aditivo(db, clase_funcional)

@router_clases_funcionales.put("/{clase_funcional_id}", response_model=schemas.ClaseFuncionalAditivo)
def update_clase_funcional(
    clase_funcional_id: int, 
    clase_funcional: schemas.ClaseFuncionalAditivoUpdate,
    db: Annotated[Session, Depends(get_db)]
):
    return services.modificar_clase_funcional(db, clase_funcional_id, clase_funcional)



# --- Gestion de aditivos ---
@router.get("/", response_model=list[schemas.Aditivo])
def listar_aditivos(db: Annotated[Session, Depends(get_db)]):
    return services.listar_aditivos(db)

@router.post("/", response_model=schemas.Aditivo)
def crear_aditivo(
    aditivo: schemas.AditivoCreate,
    db: Annotated[Session, Depends(get_db)],
):
    return services.crear_aditivo(db, aditivo)