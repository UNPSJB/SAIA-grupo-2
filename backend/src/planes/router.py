import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.planes import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/planes", tags=["planes"])


@router.post("/", response_model=schemas.Plan)
def create_plan(plan: schemas.PlanCreate, db: Session = Depends(get_db)):
    return services.crear_plan(db, plan)


@router.get("/", response_model=list[schemas.Plan])
def read_planes(db: Session = Depends(get_db)):
    logger.info("Consultando la lista de planes desde endpoint...")
    return services.listar_planes(db)


@router.get("/{plan_id}", response_model=schemas.Plan)
def read_plan(plan_id: int, db: Session = Depends(get_db)):
    return services.leer_plan(db, plan_id)


@router.put("/{plan_id}", response_model=schemas.Plan)
def update_plan(plan_id: int, plan: schemas.PlanUpdate, db: Session = Depends(get_db)):
    return services.modificar_plan(db, plan_id, plan)


@router.delete("/{plan_id}", response_model=schemas.PlanDelete)
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    return services.eliminar_plan(db, plan_id)
