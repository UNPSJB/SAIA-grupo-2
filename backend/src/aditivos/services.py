import logging
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, insert, func, update, desc

from src.aditivos.models import ClaseFuncionalAditivo, Aditivo
from src.aditivos import schemas, exceptions

logger = logging.getLogger(__name__)

# --- Funciones de apoyo ---
# Recien noto que estuve escribiendo lineas identicas solo por amor al juego
# (Repitiendo la linea de verificacion is not None y lanzando excepcion cada vez, fuera de la funcion de busqueda)
def verificar_duplicado_clase_funcional( 
        db: Session, 
        clase_funcional_nombre:str
    ) -> None:
    CLASE_FUNCIONAL_DUPLICADA = db.scalar(
        select(ClaseFuncionalAditivo)
        .where(ClaseFuncionalAditivo.nombre == clase_funcional_nombre)
    )
    if CLASE_FUNCIONAL_DUPLICADA is not None:
        raise exceptions.ClaseFuncionalDuplicada()

def verificar_duplicado_ins(
        db:Session,
        aditivo_numero_ins:str
    )-> None:
    NUMERO_INS_DUPLICADO = db.scalar(
        select(Aditivo)
        .where(Aditivo.numero_ins == aditivo_numero_ins)
    )
    if NUMERO_INS_DUPLICADO is not None:
        raise exceptions.NumeroINSDuplicado()

# Verifica si lo necesita: En tal caso, que tenga, y si tiene, que no sea duplicado
def validar_ins_aditivo(
        db:Session,
        clase_funcional_id:int,
        aditivo_numero_ins: str | None
    )-> str | None:
    clase_funcional = leer_clase_funcional_orm(db, clase_funcional_id)
    if clase_funcional.necesita_ins:
        if aditivo_numero_ins is None:
            raise exceptions.NumeroINSRequerido()
        else:
            verificar_duplicado_ins(db, aditivo_numero_ins)
            return aditivo_numero_ins
    else:
        return None

def leer_clase_funcional_orm(
        db:Session,
        clase_funcional_id:int
    )-> ClaseFuncionalAditivo:
    clase_funcional = db.scalar(
        select(ClaseFuncionalAditivo)
        .where(ClaseFuncionalAditivo.id == clase_funcional_id)
    )
    CLASE_FUNCIONAL_NO_EXISTE = clase_funcional is None
    if CLASE_FUNCIONAL_NO_EXISTE:
        raise exceptions.ClaseFuncionalNoEncontrada()
    return clase_funcional

def validar_campos_aditivo(
        db:Session,
        aditivo:Aditivo
)-> Aditivo:
    if aditivo.nombre_completo is None:
        raise exceptions.NombreRequerido()
    if aditivo.clase_funcional_id is None:
        raise exceptions.ClaseFuncionalRequerida()
    aditivo.numero_ins = validar_ins_aditivo(db, aditivo.clase_funcional_id, aditivo.numero_ins)
    return aditivo

def verificar_clase_sin_aditivos(
        db:Session,
        clase_funcional_id:int
    )-> None:
    aditivos = listar_aditivos_de_clase(db, clase_funcional_id)
    if aditivos:
        raise exceptions.ClaseFuncionalConAditivos()


# --- Clase funcional ---
def listar_clases_funcionales_aditivos (
        db: Session
    ) -> List [schemas.ClaseFuncionalAditivo]:
    logger.info ("Listando clases funcionales de aditivos desde services")
    clases = db.scalars(select(ClaseFuncionalAditivo)).all()
    return clases

def listar_aditivos_de_clase(
        db: Session,
        clase_funcional_id: int
    ) -> List [schemas.Aditivo]:
    aditivos = db.scalars(
        select(Aditivo)
        .where(Aditivo.clase_funcional_id == clase_funcional_id)
    ).all()
    return aditivos

def leer_clase_funcional(
    db:Session,
    clase_funcional_id: int
)->schemas.ClaseFuncionalAditivo:
    clase = leer_clase_funcional_orm(db, clase_funcional_id)
    return schemas.ClaseFuncionalAditivo.model_validate(clase)

def crear_clase_funcional_aditivo(
        db: Session, 
        clase_funcional: schemas.ClaseFuncionalAditivoCreate
    ) -> schemas.ClaseFuncionalAditivo:
    _clasefuncionaladitivo = ClaseFuncionalAditivo(**clase_funcional.model_dump())
    verificar_duplicado_clase_funcional(db, _clasefuncionaladitivo.nombre)
    db.add(_clasefuncionaladitivo)
    db.commit()
    db.refresh(_clasefuncionaladitivo)
    return _clasefuncionaladitivo

def modificar_clase_funcional(
        db:Session,
        clase_funcional_id: int,
        clase_funcional:schemas.ClaseFuncionalAditivoUpdate
    )->schemas.ClaseFuncionalAditivo:
        _clasefuncionaladitivo = ClaseFuncionalAditivo(**clase_funcional.model_dump())
        db_clase_funcional = leer_clase_funcional_orm(db, clase_funcional_id)
        verificar_clase_sin_aditivos(db, clase_funcional_id)
        if _clasefuncionaladitivo.nombre != db_clase_funcional.nombre:
            verificar_duplicado_clase_funcional(db,_clasefuncionaladitivo.nombre)
            db_clase_funcional.nombre = _clasefuncionaladitivo.nombre
        if _clasefuncionaladitivo.necesita_ins != db_clase_funcional.necesita_ins:          
            db_clase_funcional.necesita_ins = _clasefuncionaladitivo.necesita_ins
        db.commit()
        db.refresh(db_clase_funcional)
        return db_clase_funcional
        


# --- Aditivo ---
def listar_aditivos(
        db:Session
    )-> List [schemas.Aditivo]:
    logger.info ("Listando aditivos desde services")
    aditivos = db.scalars(select(Aditivo)).all()
    return aditivos

def leer_aditivo(
        db:Session,
        aditivo_id: int
    )->schemas.Aditivo:
    aditivo = db.scalar(
        select(Aditivo)
        .where(Aditivo.id == aditivo_id)
    )
    if aditivo is None:
        raise exceptions.AditivoNoEncontrado()
    return schemas.Aditivo.model_validate(aditivo)

def crear_aditivo(
        db:Session,
        aditivo:schemas.AditivoCreate
    )->schemas.Aditivo:
    _aditivo = Aditivo(**aditivo.model_dump())
    _aditivo = validar_campos_aditivo(db,_aditivo)
    db.add(_aditivo)
    db.commit()
    db.refresh(_aditivo)
    return _aditivo