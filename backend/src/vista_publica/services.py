import uuid
from datetime import datetime, date, timedelta, timezone
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from src.vista_publica.models import ConfiguracionVistaPublica
from src.vista_publica import schemas, exceptions
from src.equipos.models import Equipo
from src.equipos.constants import EstadoMantenimiento
from src.checklists.services import obtener_historial_checklists, obtener_grafico_cumplimiento
from src.checklists.constants import GranularidadCumplimiento
from src.documentos_versionados.models import DocumentoVersionado
from src.documentacion.models import Documentacion
from src.lotes_produccion.models import LoteProduccion

def listar_configuraciones(db: Session) -> List[ConfiguracionVistaPublica]:
    return db.scalars(select(ConfiguracionVistaPublica).order_by(ConfiguracionVistaPublica.id)).all()

def get_configuracion(db: Session) -> ConfiguracionVistaPublica:
    configs = db.scalars(select(ConfiguracionVistaPublica).order_by(ConfiguracionVistaPublica.id)).all()
    if not configs:
        default_config = ConfiguracionVistaPublica(
            nombre="Vista Pública",
            activa=False,
            token=uuid.uuid4().hex,
            mostrar_cumplimiento_limpieza=True,
            mostrar_equipos_calibrados=True
        )
        db.add(default_config)
        db.commit()
        db.refresh(default_config)
        return default_config
    return configs[0]

def crear_configuracion(db: Session, datos: schemas.ConfiguracionVistaPublicaCreate) -> ConfiguracionVistaPublica:
    nombre = datos.nombre.strip() if datos.nombre and datos.nombre.strip() else "Vista Pública"
    nueva_config = ConfiguracionVistaPublica(
        nombre=nombre,
        activa=False,
        token=uuid.uuid4().hex,
        mostrar_cumplimiento_limpieza=True,
        mostrar_equipos_calibrados=True
    )
    db.add(nueva_config)
    db.commit()
    db.refresh(nueva_config)
    return nueva_config

def modificar_configuracion(db: Session, config_id: int, conf_update: schemas.ConfiguracionVistaPublicaUpdate) -> ConfiguracionVistaPublica:
    config = db.scalar(select(ConfiguracionVistaPublica).where(ConfiguracionVistaPublica.id == config_id))
    if not config:
        raise exceptions.ConfiguracionNoEncontradaException()

    if conf_update.nombre is not None:
        config.nombre = conf_update.nombre.strip() or config.nombre

    if conf_update.activa is not None:
        config.activa = conf_update.activa
        if config.activa:
            config.fecha_activacion = datetime.now(timezone.utc)
            if not config.token:
                config.token = uuid.uuid4().hex
        else:
            config.fecha_activacion = None

    if conf_update.mostrar_cumplimiento_limpieza is not None:
        config.mostrar_cumplimiento_limpieza = conf_update.mostrar_cumplimiento_limpieza

    if conf_update.mostrar_equipos_calibrados is not None:
        config.mostrar_equipos_calibrados = conf_update.mostrar_equipos_calibrados

    if conf_update.mostrar_capacitaciones is not None:
        config.mostrar_capacitaciones = conf_update.mostrar_capacitaciones

    if conf_update.mostrar_poes_vigentes is not None:
        config.mostrar_poes_vigentes = conf_update.mostrar_poes_vigentes

    if conf_update.mostrar_trazabilidad_lotes is not None:
        config.mostrar_trazabilidad_lotes = conf_update.mostrar_trazabilidad_lotes

    db.commit()
    db.refresh(config)
    return config

def update_configuracion(db: Session, conf_update: schemas.ConfiguracionVistaPublicaUpdate) -> ConfiguracionVistaPublica:
    config = get_configuracion(db)
    return modificar_configuracion(db, config.id, conf_update)

def eliminar_configuracion(db: Session, config_id: int) -> None:
    config = db.scalar(select(ConfiguracionVistaPublica).where(ConfiguracionVistaPublica.id == config_id))
    if not config:
        raise exceptions.ConfiguracionNoEncontradaException()
    db.delete(config)
    db.commit()

def obtener_vista_publica(db: Session, token: str) -> schemas.VistaPublicaResumenResponse:
    config = db.scalar(select(ConfiguracionVistaPublica).where(ConfiguracionVistaPublica.token == token))
    if not config or not config.activa:
        raise exceptions.VistaPublicaDesactivadaException()

    hoy = date.today()

    # 1. Cumplimiento de limpieza (siempre calculado)
    pct_limpieza: Optional[float] = None
    hace_30_dias = hoy - timedelta(days=29)
    historial = obtener_historial_checklists(db, fecha_inicio=hace_30_dias, fecha_fin=hoy)
    if historial.total_esperadas > 0:
        pct_limpieza = historial.porcentaje_cumplimiento

    # Serie del grafico (siempre calculado)
    hace_14_dias = hoy - timedelta(days=13)
    grafico = obtener_grafico_cumplimiento(db, fecha_desde=hace_14_dias, fecha_hasta=hoy, granularidad=GranularidadCumplimiento.DIA)
    dias_serie = [
        schemas.ItemSeriePublica(
            periodo=item.periodo if isinstance(item.periodo, str) else item.periodo.isoformat(),
            porcentaje=item.porcentaje
        )
        for item in grafico.serie
    ]

    # 2. Equipos (siempre calculado)
    pct_equipos: Optional[float] = None
    equipos_activos = db.scalars(select(Equipo).where(Equipo.activo == True)).all()
    total_equipos = len(equipos_activos)
    equipos_al_dia = sum(1 for eq in equipos_activos if eq.estado_mantenimiento != EstadoMantenimiento.VENCIDO)
    if total_equipos > 0:
        pct_equipos = round((equipos_al_dia / total_equipos) * 100, 1)

    # 3. Capacitaciones (siempre calculado)
    pct_capacitaciones: Optional[float] = None
    total_docs = db.scalar(select(func.count(Documentacion.id))) or 0
    vigentes_docs = db.scalar(select(func.count(Documentacion.id)).where(Documentacion.fecha_vencimiento >= hoy)) or 0
    if total_docs > 0:
        pct_capacitaciones = round((vigentes_docs / total_docs) * 100, 1)

    # 4. POES (siempre calculado)
    pct_poes: Optional[float] = None
    total_poes = db.scalar(select(func.count(DocumentoVersionado.id))) or 0
    if total_poes > 0:
        pct_poes = 100.0

    # 5. Lotes (siempre calculado)
    pct_lotes: Optional[float] = None
    total_lotes = db.scalar(select(func.count(LoteProduccion.nro_lote))) or 0
    if total_lotes > 0:
        pct_lotes = 100.0

    return schemas.VistaPublicaResumenResponse(
        activa=True,
        nombre=config.nombre,
        fecha_actualizacion=datetime.now(timezone.utc),
        mostrar_cumplimiento_limpieza=config.mostrar_cumplimiento_limpieza,
        mostrar_equipos_calibrados=config.mostrar_equipos_calibrados,
        mostrar_capacitaciones=config.mostrar_capacitaciones,
        mostrar_poes_vigentes=config.mostrar_poes_vigentes,
        mostrar_trazabilidad_lotes=config.mostrar_trazabilidad_lotes,
        porcentaje_cumplimiento_limpieza=pct_limpieza,
        porcentaje_equipos_al_dia=pct_equipos,
        porcentaje_personal_capacitado=pct_capacitaciones,
        porcentaje_poes_vigentes=pct_poes,
        porcentaje_lotes_trazables=pct_lotes,
        serie_cumplimiento=dias_serie
    )
