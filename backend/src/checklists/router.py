import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Header
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from src.database import get_db
from src.checklists import schemas, services
from src.empleados.models import Empleado

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/checklists", tags=["checklists"])

def obtener_empleado_actual(
    empleado_id: Optional[int] = Query(None),
    x_empleado_id: Optional[int] = Header(None, alias="X-Empleado-Id"),
    db: Session = Depends(get_db)
) -> Optional[Empleado]:
    eid = empleado_id or x_empleado_id
    if not eid:
        return None
    return db.scalar(
        select(Empleado)
        .options(selectinload(Empleado.sectores))
        .where(Empleado.id == eid)
    )

@router.get("/hoy", response_model=List[schemas.ChecklistItem])
def obtener_checklist_hoy(
    empleado: Optional[Empleado] = Depends(obtener_empleado_actual),
    db: Session = Depends(get_db)
):
    return services.obtener_checklist_diario(db, empleado)

@router.post("/{tarea_id}/marcar", response_model=schemas.RegistroChecklistDetalle)
def marcar_tarea(
    tarea_id: int, 
    payload: schemas.ChecklistMarcar, 
    db: Session = Depends(get_db)
):
    return services.marcar_tarea_completada(db, tarea_id, payload)

@router.get("/detalle", response_model=schemas.RegistroChecklistDetalle)
def obtener_detalle_tarea(
    tarea_id: int = Query(...),
    plan_id: int = Query(0),
    db: Session = Depends(get_db)
):
    return services.obtener_detalle_tarea_realizada(db, tarea_id, plan_id)
