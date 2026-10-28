import logging
from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.archivos import validar_archivo_opcional
from src.empleados import services as empleados_services
from src.incidentes import exceptions, models, schemas
from src.incidentes.constants import EstadoIncidente, TipoIncidente, TipoMovimiento

logger = logging.getLogger(__name__)


def crear_incidente(db: Session, incidente: schemas.IncidenteCreate) -> models.Incidente:
    empleados_services.leer_empleado(db, incidente.empleado_id)
    validar_archivo_opcional(incidente.archivo_url)

    db_incidente = models.Incidente(**incidente.model_dump())

    db.add(db_incidente)
    db.commit()
    db.refresh(db_incidente)
    return db_incidente


def listar_incidentes(
    db: Session,
    estado: Optional[EstadoIncidente] = None,
    tipo: Optional[TipoIncidente] = None,
    empleado_id: Optional[int] = None,
) -> List[models.Incidente]:
    logger.info("Consultando la lista de incidentes desde services")
    consulta = select(models.Incidente)

    if estado is not None:
        consulta = consulta.where(models.Incidente.estado == estado)
    if tipo is not None:
        consulta = consulta.where(models.Incidente.tipo == tipo)
    if empleado_id is not None:
        consulta = consulta.where(models.Incidente.empleado_id == empleado_id)

    consulta = consulta.order_by(models.Incidente.fecha_hora_reporte.desc())
    return list(db.scalars(consulta).unique().all())


def listar_abiertos(db: Session) -> List[models.Incidente]:
    """Mas antiguos primero, para la HU de incidentes abiertos."""
    consulta = (
        select(models.Incidente)
        .where(models.Incidente.estado == EstadoIncidente.ABIERTO)
        .order_by(models.Incidente.fecha_hora_reporte.asc())
    )
    return list(db.scalars(consulta).unique().all())


def leer_incidente(db: Session, incidente_id: int) -> models.Incidente:
    db_incidente = db.scalar(
        select(models.Incidente).where(models.Incidente.id == incidente_id)
    )
    if db_incidente is None:
        raise exceptions.IncidenteNoEncontrado()
    return db_incidente


def adjuntar_foto(
    db: Session, incidente_id: int, foto: schemas.FotoIncidente
) -> models.Incidente:
    """Permite completar la foto que no se cargo al registrar, sin tocar el resto."""
    db_incidente = leer_incidente(db, incidente_id)

    if db_incidente.archivo_url:
        raise exceptions.FotoYaCargada()

    if not foto.archivo_url:
        raise exceptions.FotoRequerida()

    validar_archivo_opcional(foto.archivo_url)

    db_incidente.archivo_url = foto.archivo_url
    db_incidente.archivo_nombre = foto.archivo_nombre

    db.commit()
    db.refresh(db_incidente)
    return db_incidente


def _registrar_movimiento(
    db: Session,
    db_incidente: models.Incidente,
    tipo: TipoMovimiento,
    descripcion: str,
    empleado_id: int,
) -> None:
    db.add(
        models.MovimientoIncidente(
            incidente_id=db_incidente.id,
            tipo=tipo,
            descripcion=descripcion,
            empleado_id=empleado_id,
            fecha_hora=models.ahora(),
        )
    )


def cerrar_incidente(
    db: Session, incidente_id: int, cierre: schemas.CierreIncidente
) -> models.Incidente:
    """Registra la accion correctiva y deja el incidente cerrado."""
    db_incidente = leer_incidente(db, incidente_id)

    if db_incidente.estado == EstadoIncidente.CERRADO:
        raise exceptions.IncidenteYaCerrado()

    if not cierre.accion_correctiva.strip():
        raise exceptions.AccionCorrectivaRequerida()

    empleados_services.leer_empleado(db, cierre.responsable_id)

    db_incidente.accion_correctiva = cierre.accion_correctiva
    db_incidente.fecha_cierre = models.ahora()
    db_incidente.responsable_cierre_id = cierre.responsable_id
    db_incidente.estado = EstadoIncidente.CERRADO

    _registrar_movimiento(
        db,
        db_incidente,
        TipoMovimiento.CIERRE,
        cierre.accion_correctiva,
        cierre.responsable_id,
    )

    db.commit()
    db.refresh(db_incidente)
    return db_incidente


def reabrir_incidente(
    db: Session, incidente_id: int, reapertura: schemas.ReaperturaIncidente
) -> models.Incidente:
    """Vuelve a abrir el incidente. La accion correctiva anterior queda en el historial."""
    db_incidente = leer_incidente(db, incidente_id)

    if db_incidente.estado != EstadoIncidente.CERRADO:
        raise exceptions.IncidenteNoCerrado()

    if not reapertura.motivo.strip():
        raise exceptions.MotivoReaperturaRequerido()

    empleados_services.leer_empleado(db, reapertura.responsable_id)

    _registrar_movimiento(
        db,
        db_incidente,
        TipoMovimiento.REAPERTURA,
        reapertura.motivo,
        reapertura.responsable_id,
    )

    db_incidente.accion_correctiva = None
    db_incidente.fecha_cierre = None
    db_incidente.responsable_cierre_id = None
    db_incidente.estado = EstadoIncidente.ABIERTO

    db.commit()
    db.refresh(db_incidente)
    return db_incidente


def resumen_incidentes(db: Session) -> schemas.ResumenIncidentes:
    """Conteos para el tablero: cuantos hay abiertos y de que tipo."""
    abiertos = listar_abiertos(db)

    por_tipo = {tipo: 0 for tipo in TipoIncidente}
    for incidente in abiertos:
        por_tipo[incidente.tipo] += 1

    total = db.scalar(select(func.count()).select_from(models.Incidente)) or 0

    return schemas.ResumenIncidentes(
        abiertos=len(abiertos),
        cerrados=total - len(abiertos),
        total=total,
        abiertos_por_tipo=[
            schemas.ConteoPorTipo(tipo=tipo, cantidad=cantidad)
            for tipo, cantidad in por_tipo.items()
        ],
    )
def obtener_estadisticas_por_tipo(
    db: Session,
    fecha_desde: date,
    fecha_hasta: date,
) -> list[dict]:
    desde = datetime.combine(
        fecha_desde, time.min, tzinfo=timezone.utc
    )
    hasta_exclusiva = datetime.combine(
        fecha_hasta + timedelta(days=1),
        time.min,
        tzinfo=timezone.utc,
    )

    consulta = (
        select(
            models.Incidente.tipo,
            func.count(models.Incidente.id).label("cantidad"),
        )
        .where(
            models.Incidente.fecha_hora_reporte >= desde,
            models.Incidente.fecha_hora_reporte < hasta_exclusiva,
        )
        .group_by(models.Incidente.tipo)
        .order_by(models.Incidente.tipo)
    )

    resultados = db.execute(consulta).all()

    return [
        {"tipo": tipo, "cantidad": cantidad}
        for tipo, cantidad in resultados
    ]
