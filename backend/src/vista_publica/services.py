import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.vista_publica.models import ConfiguracionVistaPublica
from src.vista_publica import schemas, exceptions
from src.equipos.models import Equipo
from src.equipos.constants import EstadoMantenimiento
from src.checklists.services import obtener_historial_checklists, obtener_grafico_cumplimiento
from src.checklists.constants import GranularidadCumplimiento

def get_configuracion(db: Session) -> ConfiguracionVistaPublica:
    config = db.scalar(select(ConfiguracionVistaPublica))
    if not config:
        config = ConfiguracionVistaPublica(
            activa=False,
            token=uuid.uuid4().hex
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    elif not config.token:
        config.token = uuid.uuid4().hex
        db.commit()
        db.refresh(config)
    return config

def update_configuracion(db: Session, conf_update: schemas.ConfiguracionVistaPublicaUpdate) -> ConfiguracionVistaPublica:
    config = db.scalar(select(ConfiguracionVistaPublica))
    if not config:
        config = ConfiguracionVistaPublica(token=uuid.uuid4().hex)
        db.add(config)
        db.flush()

    config.activa = conf_update.activa
    if config.activa:
        config.fecha_activacion = datetime.now(timezone.utc)
        if not config.token:
            config.token = uuid.uuid4().hex
    else:
        config.fecha_activacion = None

    db.commit()
    db.refresh(config)
    return config

def obtener_vista_publica(db: Session, token: str) -> schemas.VistaPublicaResumenResponse:
    config = db.scalar(select(ConfiguracionVistaPublica).where(ConfiguracionVistaPublica.token == token))
    if not config or not config.activa:
        raise exceptions.VistaPublicaDesactivadaException()

    hoy = date.today()
    hace_30_dias = hoy - timedelta(days=29)

    historial = obtener_historial_checklists(db, fecha_inicio=hace_30_dias, fecha_fin=hoy)

    pct_limpieza: Optional[float] = None
    if historial.total_esperadas > 0:
        pct_limpieza = historial.porcentaje_cumplimiento

    equipos_activos = db.scalars(select(Equipo).where(Equipo.activo == True)).all()
    total_equipos = len(equipos_activos)
    equipos_al_dia = sum(1 for eq in equipos_activos if eq.estado_mantenimiento != EstadoMantenimiento.VENCIDO)

    pct_equipos: Optional[float] = None
    if total_equipos > 0:
        pct_equipos = round((equipos_al_dia / total_equipos) * 100, 1)

    hace_14_dias = hoy - timedelta(days=13)
    grafico = obtener_grafico_cumplimiento(db, fecha_desde=hace_14_dias, fecha_hasta=hoy, granularidad=GranularidadCumplimiento.DIA)

    dias_serie = [
        schemas.ItemSeriePublica(
            periodo=item.periodo if isinstance(item.periodo, str) else item.periodo.isoformat(),
            porcentaje=item.porcentaje
        )
        for item in grafico.serie
    ]

    return schemas.VistaPublicaResumenResponse(
        activa=True,
        fecha_actualizacion=datetime.now(timezone.utc),
        porcentaje_cumplimiento_limpieza=pct_limpieza,
        porcentaje_equipos_al_dia=pct_equipos,
        serie_cumplimiento=dias_serie
    )
