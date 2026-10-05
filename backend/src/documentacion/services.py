import logging
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from src.documentacion import exceptions, models, schemas
from src.documentacion.constants import DIAS_AVISO_POR_DEFECTO, TipoDocumentacion
from src.empleados import services as empleados_services
from src.empleados.models import Empleado
from src.vencimientos import EstadoVencimiento

logger = logging.getLogger(__name__)

MODELO_POR_TIPO = {
    TipoDocumentacion.LIBRETA_SANITARIA: models.LibretaSanitaria,
    TipoDocumentacion.CAPACITACION: models.Capacitacion,
    TipoDocumentacion.CERTIFICADO_APTITUD_FISICA: models.CertificadoAptitudFisica,
}

ORDEN_ESTADO = {
    EstadoVencimiento.VENCIDO: 0,
    EstadoVencimiento.PROXIMO: 1,
    EstadoVencimiento.VIGENTE: 2,
}


def _descripcion(db_documento: models.Documentacion) -> str:
    if isinstance(db_documento, models.LibretaSanitaria):
        return f"Libreta sanitaria N° {db_documento.numero_carnet}"
    if isinstance(db_documento, models.Capacitacion):
        return f"Capacitación: {db_documento.titulo}"
    if isinstance(db_documento, models.CertificadoAptitudFisica):
        return f"Apto físico (Dr/a. {db_documento.nombre_medico})"
    return "Documento"


def crear_documentacion(
    db: Session, documento: schemas.DocumentacionCreate
) -> schemas.Documentacion:
    empleados_services.leer_empleado(db, documento.empleado_id)

    modelo = MODELO_POR_TIPO[documento.tipo]
    db_documento = modelo(**documento.model_dump())

    try:
        db.add(db_documento)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.NumeroCarnetDuplicado()

    db.refresh(db_documento)
    return db_documento


def listar_documentacion(
    db: Session,
    empleado_id: Optional[int] = None,
    tipo: Optional[TipoDocumentacion] = None,
) -> List[schemas.Documentacion]:
    logger.info("Consultando la lista de documentacion desde services")
    consulta = select(models.Documentacion).options(
        selectinload(models.Documentacion.empleado)
    )
    if empleado_id is not None:
        consulta = consulta.where(models.Documentacion.empleado_id == empleado_id)
    if tipo is not None:
        consulta = consulta.where(models.Documentacion.tipo == tipo)

    documentos = db.scalars(consulta).all()
    return sorted(documentos, key=lambda d: d.fecha_vencimiento)


def obtener_alertas(
    db: Session, tipo: Optional[TipoDocumentacion] = None
) -> List[schemas.AlertaVencimiento]:
    logger.info("Generando alertas de vencimiento de documentacion desde services")
    documentos = listar_documentacion(db, tipo=tipo)

    alertas = [
        schemas.AlertaVencimiento(
            id=d.id,
            tipo=d.tipo,
            descripcion=_descripcion(d),
            empleado=d.empleado,
            fecha_vencimiento=d.fecha_vencimiento,
            dias_restantes=d.dias_restantes,
            estado=d.estado,
        )
        for d in documentos
    ]

    return sorted(alertas, key=lambda a: (ORDEN_ESTADO[a.estado], a.dias_restantes))


def leer_documentacion(db: Session, documentacion_id: int) -> schemas.Documentacion:
    db_documento = db.scalar(
        select(models.Documentacion)
        .options(selectinload(models.Documentacion.empleado))
        .where(models.Documentacion.id == documentacion_id)
    )
    if db_documento is None:
        raise exceptions.DocumentacionNoEncontrada()
    return db_documento


def modificar_documentacion(
    db: Session, documentacion_id: int, documento: schemas.DocumentacionUpdate
) -> schemas.Documentacion:
    db_documento = leer_documentacion(db, documentacion_id)

    campos = documento.model_dump(exclude_unset=True)
    for campo, valor in campos.items():
        if hasattr(db_documento, campo):
            setattr(db_documento, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.NumeroCarnetDuplicado()

    db.refresh(db_documento)
    return db_documento


def eliminar_documentacion(
    db: Session, documentacion_id: int
) -> schemas.DocumentacionDelete:
    db_documento = leer_documentacion(db, documentacion_id)
    db.delete(db_documento)
    db.commit()
    return {"id": documentacion_id, "msg": "borrado"}


def listar_requisitos(db: Session) -> List[schemas.RequisitoDocumentacion]:
    """Devuelve un requisito por cada tipo, creando los que falten en no obligatorio."""
    existentes = {r.tipo: r for r in db.scalars(select(models.RequisitoDocumentacion)).all()}

    creados = False
    for tipo in TipoDocumentacion:
        if tipo not in existentes:
            db_requisito = models.RequisitoDocumentacion(
                tipo=tipo,
                obligatorio=False,
                dias_aviso_previo=DIAS_AVISO_POR_DEFECTO[tipo],
            )
            db.add(db_requisito)
            existentes[tipo] = db_requisito
            creados = True

    if creados:
        db.commit()

    return [existentes[tipo] for tipo in TipoDocumentacion]


def modificar_requisito(
    db: Session, tipo: TipoDocumentacion, requisito: schemas.RequisitoUpdate
) -> schemas.RequisitoDocumentacion:
    listar_requisitos(db)
    db_requisito = db.get(models.RequisitoDocumentacion, tipo)

    for campo, valor in requisito.model_dump(exclude_unset=True).items():
        if valor is not None:
            setattr(db_requisito, campo, valor)

    db.commit()
    db.refresh(db_requisito)
    return db_requisito


def tipos_obligatorios(db: Session) -> List[TipoDocumentacion]:
    return [r.tipo for r in listar_requisitos(db) if r.obligatorio]


def _cumplimiento(db_empleado, obligatorios) -> schemas.CumplimientoEmpleado:
    documentos = {d.tipo: d for d in db_empleado.documentacion}

    faltantes = [t for t in obligatorios if t not in documentos]
    vencidos = [
        t for t in obligatorios
        if t in documentos and documentos[t].estado == EstadoVencimiento.VENCIDO
    ]

    return schemas.CumplimientoEmpleado(
        empleado=db_empleado,
        completo=not faltantes and not vencidos,
        faltantes=faltantes,
        vencidos=vencidos,
    )


def obtener_cumplimiento(db: Session, empleado_id: int) -> schemas.CumplimientoEmpleado:
    db_empleado = empleados_services.leer_empleado(db, empleado_id)
    return _cumplimiento(db_empleado, tipos_obligatorios(db))


def listar_cumplimiento(
    db: Session, solo_incompletos: bool = False
) -> List[schemas.CumplimientoEmpleado]:
    logger.info("Consultando el cumplimiento documental del personal desde services")
    obligatorios = tipos_obligatorios(db)

    empleados = db.scalars(
        select(Empleado)
        .options(selectinload(Empleado.documentacion))
        .where(Empleado.activo.is_(True))
    ).all()

    resultado = [_cumplimiento(e, obligatorios) for e in empleados]

    if solo_incompletos:
        resultado = [c for c in resultado if not c.completo]

    return resultado
