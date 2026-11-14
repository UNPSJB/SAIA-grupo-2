from datetime import date, datetime, time
from typing import List, Optional

from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from src.asociaciones.lote_insumos import lote_insumo
from src.empleados import services as empleados_services
from src.insumos import services as insumos_services
from src.insumos.models import Insumo
from src.lotes_produccion import exceptions, schemas
from src.lotes_produccion.models import LoteProduccion
from src.productos import services as productos_services
from src.unidades_medida import services as unidades_services
from src.unidades_medida.models import UnidadMedida


def _registrar_consumo(db: Session, nro_lote: int, utilizado: schemas.InsumoUtilizado) -> None:
    db_insumo = db.get(Insumo, utilizado.insumo_id)
    if db_insumo is None:
        raise exceptions.InsumoNoEncontrado()
    if not db_insumo.activo:
        raise exceptions.InsumoInactivo()

    cantidad = insumos_services.cantidad_en_base(
        db, db_insumo, utilizado.cantidad_utilizada, utilizado.unidad_medida_id
    )
    stock_actual = db_insumo.cantidad or 0.0
    if stock_actual < cantidad:
        raise exceptions.StockInsuficiente()

    db_insumo.cantidad = round(stock_actual - cantidad, 2)
    unidad = unidades_services.unidad_base(db, db_insumo.unidad_medida.magnitud)
    db.execute(
        insert(lote_insumo).values(
            lote_id=nro_lote,
            insumo_id=db_insumo.id,
            cantidad_utilizada=cantidad,
            unidad_medida_id=unidad.id,
        )
    )


def _validar_sin_repetidos(insumos: List[schemas.InsumoUtilizado]) -> None:
    ids_insumos = [utilizado.insumo_id for utilizado in insumos]
    if len(ids_insumos) != len(set(ids_insumos)):
        raise exceptions.InsumoRepetido()


def crear_lote(db: Session, lote: schemas.LoteProduccionCreate) -> LoteProduccion:
    """Registra el lote y descuenta del stock los insumos consumidos, todo en una sola operacion.

    Si algun insumo no se puede descontar no se guarda nada. Una vez registrado, el consumo
    declarado no se modifica: el stock solo vuelve a subir desde la carga de stock del insumo.
    """
    productos_services.leer_producto(db, lote.producto_id)

    if lote.fecha > date.today():
        raise exceptions.FechaFutura()
    if lote.cantidad <= 0:
        raise exceptions.CantidadInvalida()
    _validar_sin_repetidos(lote.insumos)

    try:
        db_lote = LoteProduccion(**lote.model_dump(exclude={"insumos"}), fecha_registro=datetime.now())
        db.add(db_lote)
        db.flush()
        for utilizado in lote.insumos:
            _registrar_consumo(db, db_lote.nro_lote, utilizado)
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(db_lote)
    return db_lote


def cerrar_lotes_vencidos(db: Session) -> int:
    """Cierra los lotes que siguen abiertos de un dia anterior, con fecha de cierre al final de ese dia."""
    inicio_de_hoy = datetime.combine(date.today(), time.min)
    vencidos = db.scalars(
        select(LoteProduccion).where(
            LoteProduccion.fecha_cierre.is_(None), LoteProduccion.fecha_registro < inicio_de_hoy
        )
    ).all()
    for db_lote in vencidos:
        db_lote.fecha_cierre = db_lote.cierre_automatico
    if vencidos:
        db.commit()
    return len(vencidos)


def leer_lote(db: Session, nro_lote: int) -> LoteProduccion:
    cerrar_lotes_vencidos(db)
    db_lote = db.get(LoteProduccion, nro_lote)
    if db_lote is None:
        raise exceptions.LoteNoEncontrado()
    return db_lote


def listar_lotes(
    db: Session,
    producto_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
) -> List[LoteProduccion]:
    """Historial de lotes, del mas reciente al mas antiguo, con filtros opcionales."""
    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise exceptions.RangoFechasInvalido()
    cerrar_lotes_vencidos(db)

    consulta = select(LoteProduccion)
    if producto_id is not None:
        consulta = consulta.where(LoteProduccion.producto_id == producto_id)
    if fecha_desde is not None:
        consulta = consulta.where(LoteProduccion.fecha >= fecha_desde)
    if fecha_hasta is not None:
        consulta = consulta.where(LoteProduccion.fecha <= fecha_hasta)

    return list(
        db.scalars(
            consulta.order_by(LoteProduccion.fecha.desc(), LoteProduccion.nro_lote.desc())
        ).all()
    )


def listar_insumos_lote(db: Session, nro_lote: int) -> List[schemas.InsumoAsociadoDetalle]:
    leer_lote(db, nro_lote)

    consulta = (
        select(
            lote_insumo.c.insumo_id,
            Insumo.nombre,
            lote_insumo.c.cantidad_utilizada,
            UnidadMedida.nombre.label("unidad_medida"),
            UnidadMedida.magnitud,
        )
        .join(Insumo, lote_insumo.c.insumo_id == Insumo.id)
        .join(UnidadMedida, lote_insumo.c.unidad_medida_id == UnidadMedida.id)
        .where(lote_insumo.c.lote_id == nro_lote)
        .order_by(Insumo.nombre)
    )
    return [schemas.InsumoAsociadoDetalle.model_validate(fila, from_attributes=True) for fila in db.execute(consulta).all()]


def _lote_abierto(db: Session, nro_lote: int) -> LoteProduccion:
    db_lote = leer_lote(db, nro_lote)
    if db_lote.cerrado:
        raise exceptions.LoteCerrado()
    return db_lote


def corregir_consumo(db: Session, nro_lote: int, correccion: schemas.CorreccionConsumo) -> LoteProduccion:
    """Reemplaza el consumo de un lote abierto: devuelve al stock lo declarado antes y descuenta lo nuevo.

    Es una sola operacion: si algun insumo no alcanza, el consumo y el stock quedan como estaban.
    """
    db_lote = _lote_abierto(db, nro_lote)
    _validar_sin_repetidos(correccion.insumos)

    try:
        anteriores = db.execute(
            select(lote_insumo.c.insumo_id, lote_insumo.c.cantidad_utilizada).where(lote_insumo.c.lote_id == nro_lote)
        ).all()
        for anterior in anteriores:
            db_insumo = db.get(Insumo, anterior.insumo_id)
            db_insumo.cantidad = round((db_insumo.cantidad or 0.0) + anterior.cantidad_utilizada, 2)
        db.execute(delete(lote_insumo).where(lote_insumo.c.lote_id == nro_lote))
        for utilizado in correccion.insumos:
            _registrar_consumo(db, nro_lote, utilizado)
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(db_lote)
    return db_lote


def cerrar_lote(db: Session, nro_lote: int, cierre: schemas.CierreLote) -> LoteProduccion:
    """Cierra el lote a mano antes de que termine el dia; desde ahi su consumo es de solo lectura."""
    empleado = empleados_services.leer_empleado(db, cierre.empleado_id)
    db_lote = _lote_abierto(db, nro_lote)
    db_lote.fecha_cierre = datetime.now()
    db_lote.cerrado_por = empleado
    db.commit()
    db.refresh(db_lote)
    return db_lote
