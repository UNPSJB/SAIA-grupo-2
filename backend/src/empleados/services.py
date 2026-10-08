import logging
from typing import List
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, selectinload

from src.capacidades.models import Capacidad
from src.capacidades import exceptions as CapacidadesExceptions
from src.capacidades.constants import CAPACIDAD_ADMINISTRADOR, CAPACIDAD_POR_DEFECTO
from src.empleados.models import Empleado, RolEmpleado
from src.empleados import schemas, exceptions
from src.sectores.models import Sector

logger = logging.getLogger(__name__)

def autenticar_empleado(db: Session, credenciales: schemas.LoginRequest) -> schemas.Empleado:
    db_empleado = db.scalar(
        select(Empleado)
        .options(selectinload(Empleado.capacidades), selectinload(Empleado.sectores))
        .where(Empleado.legajo == credenciales.legajo)
    )
    
    if not db_empleado or db_empleado.dni != credenciales.dni or not db_empleado.activo:
        raise exceptions.CredencialesInvalidas()
        
    return db_empleado

def generar_legajo(db: Session) -> str:
    ultimo_empleado = db.scalar(
        select(Empleado).order_by(desc(Empleado.id))
    )
    
    if ultimo_empleado and ultimo_empleado.legajo and ultimo_empleado.legajo.startswith("EMP-"):
        try:
            ultimo_numero = int(ultimo_empleado.legajo.split("-")[1])
            nuevo_numero = ultimo_numero + 1
            return f"EMP-{nuevo_numero}"
        except ValueError:
            return "EMP-1000"
    
    return "EMP-1000"

def crear_empleado(db: Session, empleado: schemas.EmpleadoCreate) -> schemas.Empleado:
    empleado_existente = db.scalar(select(Empleado).where(Empleado.dni == empleado.dni))
    if empleado_existente:
        raise exceptions.DniDuplicado()

    capacidades = []
    if empleado.listaCapacidades:
        capacidades = db.scalars(
            select(Capacidad).where(Capacidad.id.in_(empleado.listaCapacidades))
        ).all()
        if len(capacidades) != len(set(empleado.listaCapacidades)):
            raise CapacidadesExceptions.CapacidadNoEncontrada()

    if not capacidades:
        cap_defecto = db.scalar(select(Capacidad).where(Capacidad.nombre.ilike(CAPACIDAD_POR_DEFECTO)))
        if cap_defecto:
            capacidades = [cap_defecto]

    if not empleado.listaSectores or len(empleado.listaSectores) == 0:
        raise exceptions.SectorRequerido()

    sectores = db.scalars(
        select(Sector).where(Sector.id.in_(empleado.listaSectores))
    ).all()

    rol_asignado = RolEmpleado.OPERARIO
    if any(cap.nombre.strip().lower() == CAPACIDAD_ADMINISTRADOR.lower() for cap in capacidades):
        rol_asignado = RolEmpleado.ADMIN

    nuevo_legajo = generar_legajo(db)

    datos_empleado = empleado.model_dump(exclude={"listaCapacidades", "listaSectores", "rol"})
    
    _empleado = Empleado(
        **datos_empleado,
        legajo=nuevo_legajo,
        rol=rol_asignado,
        capacidades=capacidades,
        sectores=sectores,
    )
    db.add(_empleado)
    db.commit()
    db.refresh(_empleado)
    return _empleado

def listar_empleados(db: Session) -> List[schemas.Empleado]:
    return db.scalars(
        select(Empleado).options(selectinload(Empleado.capacidades), selectinload(Empleado.sectores))
    ).all()

def leer_empleado(db: Session, empleado_id: int) -> schemas.Empleado:
    db_empleado = db.scalar(
        select(Empleado)
        .options(selectinload(Empleado.capacidades), selectinload(Empleado.sectores))
        .where(Empleado.id == empleado_id)
    )
    if db_empleado is None:
        raise exceptions.EmpleadoNoEncontrado()
    return db_empleado

from fastapi import HTTPException
from sqlalchemy import update, delete

def modificar_empleado(
    db: Session, empleado_id: int, empleado: schemas.EmpleadoUpdate
) -> Empleado:
    db_empleado = db.scalar(
        select(Empleado)
        .options(selectinload(Empleado.capacidades), selectinload(Empleado.sectores))
        .where(Empleado.id == empleado_id)
    )
    if db_empleado is None:
        raise exceptions.EmpleadoNoEncontrado()

    if db_empleado.dni != empleado.dni:
        dni_existente = db.scalar(select(Empleado).where(Empleado.dni == empleado.dni))
        if dni_existente:
            raise exceptions.DniDuplicado()

    if not empleado.activo:
        sectores_cargo = db.scalars(select(Sector).where(Sector.responsable_id == empleado_id)).all()
        if sectores_cargo:
            nombres = ", ".join(s.nombre for s in sectores_cargo)
            raise HTTPException(
                status_code=400,
                detail=f"Este empleado no puede darse de baja, es el encargado del sector {nombres}."
            )

    db_empleado.dni = empleado.dni
    db_empleado.nombre = empleado.nombre
    db_empleado.apellido = empleado.apellido
    db_empleado.activo = empleado.activo

    if empleado.listaCapacidades is not None:
        if not empleado.listaCapacidades:
            cap_defecto = db.scalar(select(Capacidad).where(Capacidad.nombre.ilike(CAPACIDAD_POR_DEFECTO)))
            db_empleado.capacidades = [cap_defecto] if cap_defecto else []
            db_empleado.rol = RolEmpleado.OPERARIO
        else:
            capacidades = db.scalars(
                select(Capacidad).where(Capacidad.id.in_(empleado.listaCapacidades))
            ).all()
            if len(capacidades) != len(set(empleado.listaCapacidades)):
                raise CapacidadesExceptions.CapacidadNoEncontrada()
            
            db_empleado.capacidades = capacidades
            
            es_admin = any(c.nombre.strip().lower() == CAPACIDAD_ADMINISTRADOR.lower() for c in capacidades)
            db_empleado.rol = RolEmpleado.ADMIN if es_admin else RolEmpleado.OPERARIO

    if empleado.listaSectores is not None:
        if not empleado.listaSectores or len(empleado.listaSectores) == 0:
            raise exceptions.SectorRequerido()
        sectores = db.scalars(
            select(Sector).where(Sector.id.in_(empleado.listaSectores))
        ).all()
        db_empleado.sectores = sectores

    db.commit()
    db.refresh(db_empleado)
    return db_empleado

def eliminar_empleado(db: Session, empleado_id: int) -> schemas.Empleado:
    db_empleado = db.scalar(
        select(Empleado)
        .options(selectinload(Empleado.capacidades), selectinload(Empleado.sectores))
        .where(Empleado.id == empleado_id)
    )
    if db_empleado is None:
        raise exceptions.EmpleadoNoEncontrado()

    if db_empleado.activo:
        raise HTTPException(
            status_code=400,
            detail="Los empleados activos no se pueden eliminar físicamente. Primero debe darlo de baja lógica."
        )

    sectores_responsable = db.scalars(select(Sector).where(Sector.responsable_id == empleado_id)).all()
    if sectores_responsable:
        nombres = ", ".join(s.nombre for s in sectores_responsable)
        raise HTTPException(
            status_code=400,
            detail=f"Este empleado no puede eliminarse, es el encargado del sector {nombres}."
        )

    respuesta = schemas.Empleado.model_validate(db_empleado)

    from src.checklists.models import Checklist
    db.execute(update(Checklist).where(Checklist.empleado_id == empleado_id).values(empleado_id=None))

    if db_empleado.capacidades:
        db_empleado.capacidades.clear()
    if db_empleado.sectores:
        db_empleado.sectores.clear()

    db.delete(db_empleado)
    db.commit()

    return respuesta