import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.empleados import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/empleados", tags=["empleados"])

@router.post("/login", response_model=schemas.LoginResponse)
def login(credenciales: schemas.LoginRequest, db: Session = Depends(get_db)):
    empleado = services.autenticar_empleado(db, credenciales)
    return {"empleado": empleado, "mensaje": "Autenticación exitosa"}

@router.post("/", response_model=schemas.Empleado)
def create_empleado(empleado: schemas.EmpleadoCreate, db: Session = Depends(get_db)):
    return services.crear_empleado(db, empleado)

@router.get("/", response_model=list[schemas.Empleado])
def read_empleados(db: Session = Depends(get_db)):
    return services.listar_empleados(db)

@router.get("/{empleado_id}", response_model=schemas.Empleado)
def read_empleado(empleado_id: int, db: Session = Depends(get_db)):
    return services.leer_empleado(db, empleado_id)

@router.put("/{empleado_id}", response_model=schemas.Empleado)
def update_empleado(
    empleado_id: int, empleado: schemas.EmpleadoUpdate, db: Session = Depends(get_db)
):
    return services.modificar_empleado(db, empleado_id, empleado)

@router.delete("/{empleado_id}", response_model=schemas.Empleado)
def delete_empleado(empleado_id: int, db: Session = Depends(get_db)):
    return services.eliminar_empleado(db, empleado_id)