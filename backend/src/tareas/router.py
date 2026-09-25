import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.tareas import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tareas", tags=["tareas"])


@router.post("/", response_model=schemas.Tarea)
def create_tarea(tarea: schemas.TareaCreate, db: Session = Depends(get_db)):
    return services.crear_tarea(db, tarea)

@router.post("/{tarea_id}/completar", response_model=schemas.Tarea, status_code=status.HTTP_200_OK)
def complete_tarea(tarea_id: int, payload: schemas.Autoria, db: Session = Depends(get_db)):
    logger.info(f"Registrando finalizacion inmutable para la tarea {tarea_id} por empleado ID {payload.empleado_id}...")
    return services.completar_tarea(db, tarea_id, payload.empleado_id)

@router.get("/", response_model=list[schemas.Tarea])
def read_tareas(plan_id: int | None = None, db: Session = Depends(get_db)):
    logger.info("Consultando la lista de tareas desde endpoint...")
    return services.listar_tareas(db, plan_id)


@router.get("/{tarea_id}", response_model=schemas.Tarea)
def read_tarea(tarea_id: int, db: Session = Depends(get_db)):
    return services.leer_tarea(db, tarea_id)


@router.put("/{tarea_id}", response_model=schemas.Tarea)
def update_tarea(
    tarea_id: int, tarea: schemas.TareaUpdate, db: Session = Depends(get_db)
):
    return services.modificar_tarea(db, tarea_id, tarea)


@router.delete("/{tarea_id}", response_model=schemas.TareaDelete)
def delete_tarea(tarea_id: int, db: Session = Depends(get_db)):
    return services.eliminar_tarea(db, tarea_id)
