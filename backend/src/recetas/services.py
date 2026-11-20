import logging
from datetime import date
from typing import List, Optional
from sqlalchemy import select, func, update, insert
from sqlalchemy.orm import Session

from src.recetas.models import Receta, VersionReceta, PasoReceta, DetalleReceta, detalle_receta 
from src.recetas import schemas, exceptions
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo, DECIMALES_ESCALADO, DECIMALES_FACTOR
from src.productos.models import Producto
from src.insumos.models import Insumo
from src.unidades_medida import services as unidades_services
from src.unidades_medida.constants import MagnitudUnidad

logger = logging.getLogger(__name__)

def _validar_detalles_y_rendimientos(
    rendimiento_final_gramos: float,
    unidad_venta_gramos: float,
    detalles: List[schemas.DetalleRecetaCreate]
):
    if rendimiento_final_gramos <= 0:
        raise exceptions.RendimientoFinalInvalido()
    if unidad_venta_gramos <= 0:
        raise exceptions.UnidadVentaInvalida()
    if not detalles:
        raise exceptions.VersionInicialRequerida()

    tiene_ingrediente = any(d.tipo_uso == TipoUsoInsumo.INGREDIENTE for d in detalles)
    if not tiene_ingrediente:
        raise exceptions.TipoUsoInvalido()

    for d in detalles:
        if d.cantidad_gramos <= 0:
            raise exceptions.RendimientoFinalInvalido()

def listar_Recetas(db: Session) -> List[Receta]:
    return db.scalars(select(Receta)).all()

def leer_receta(db: Session, receta_id: int) -> Receta:
    receta = db.scalar(select(Receta).where(Receta.id == receta_id))
    if not receta:
        raise exceptions.RecetaNoEncontrada()
    return receta

def crear_receta(db: Session, datos: schemas.RecetaCreate) -> Receta:
    producto = db.scalar(select(Producto).where(Producto.id == datos.producto_id))
    if not producto:
        raise exceptions.RecetaNoEncontrada()

    receta_existente = db.scalar(select(Receta).where(Receta.producto_id == datos.producto_id))
    if receta_existente:
        raise exceptions.VersionInicialRequerida()

    v_inicial = datos.version_inicial
    _validar_detalles_y_rendimientos(
        v_inicial.rendimiento_final_gramos,
        v_inicial.unidad_venta_gramos,
        v_inicial.detalles
    )

    nueva_receta = Receta(producto_id=datos.producto_id)
    db.add(nueva_receta)
    db.flush()

    nueva_version = VersionReceta(
        receta_id=nueva_receta.id,
        version=1,
        rendimiento_final_gramos=v_inicial.rendimiento_final_gramos,
        unidad_venta_gramos=v_inicial.unidad_venta_gramos,
        medida_casera=v_inicial.medida_casera,
        motivo_cambio=v_inicial.motivo_cambio or "Creación inicial de la receta",
        creado_por_id=v_inicial.creado_por_id,
        estado=EstadoVersionReceta.ACTIVO,
        fecha_vigencia=v_inicial.fecha_vigencia or date.today()
    )
    db.add(nueva_version)
    db.flush()

    for idx, d in enumerate(v_inicial.detalles, start=1):
        db.execute(
            insert(detalle_receta).values(
                receta_id=nueva_receta.id,
                nro_version=1,
                renglon=idx,
                insumo_id=d.insumo_id,
                cantidad_gramos=d.cantidad_gramos,
                tipo_uso=d.tipo_uso.value,
                aditivo_id=d.aditivo_id
            )
        )

    for idx, p in enumerate(v_inicial.pasos, start=1):
        paso_obj = PasoReceta(
            receta_id=nueva_receta.id,
            version=1,
            orden=p.orden or idx,
            nombre_paso=p.nombre_paso,
            procedimiento=p.procedimiento,
            equipo_id=p.equipo_id,
            tiempo_minutos=p.tiempo_minutos,
            temperatura_celsius=p.temperatura_celsius,
            es_punto_control=p.es_punto_control
        )
        db.add(paso_obj)

    db.commit()
    db.refresh(nueva_receta)
    return nueva_receta

def obtener_version_vigente(db: Session, receta_id: int) -> VersionReceta:
    leer_receta(db, receta_id)
    version = db.scalar(
        select(VersionReceta).where(
            VersionReceta.receta_id == receta_id,
            VersionReceta.estado == EstadoVersionReceta.ACTIVO
        )
    )
    if not version:
        raise exceptions.VersionNoEncontrada()
    return version

def listar_versiones_de_receta(db: Session, receta_id: int) -> List[VersionReceta]:
    leer_receta(db, receta_id)
    return db.scalars(
        select(VersionReceta)
        .where(VersionReceta.receta_id == receta_id)
        .order_by(VersionReceta.version.desc())
    ).all()

def crear_version_receta(
    db: Session, receta_id: int, version_receta: schemas.VersionRecetaCreate
) -> VersionReceta:
    receta = leer_receta(db, receta_id)

    _validar_detalles_y_rendimientos(
        version_receta.rendimiento_final_gramos,
        version_receta.unidad_venta_gramos,
        version_receta.detalles
    )

    max_v = db.scalar(
        select(func.max(VersionReceta.version)).where(VersionReceta.receta_id == receta_id)
    ) or 0
    nueva_nro_version = max_v + 1

    db.execute(
        update(VersionReceta)
        .where(VersionReceta.receta_id == receta_id)
        .values(estado=EstadoVersionReceta.ARCHIVADO)
    )

    nueva_version = VersionReceta(
        receta_id=receta_id,
        version=nueva_nro_version,
        rendimiento_final_gramos=version_receta.rendimiento_final_gramos,
        unidad_venta_gramos=version_receta.unidad_venta_gramos,
        medida_casera=version_receta.medida_casera,
        motivo_cambio=version_receta.motivo_cambio or f"Actualización a versión {nueva_nro_version}",
        creado_por_id=version_receta.creado_por_id,
        estado=EstadoVersionReceta.ACTIVO,
        fecha_vigencia=version_receta.fecha_vigencia or date.today()
    )
    db.add(nueva_version)
    db.flush()

    for idx, d in enumerate(version_receta.detalles, start=1):
        db.execute(
            insert(detalle_receta).values(
                receta_id=receta_id,
                nro_version=nueva_nro_version,
                renglon=idx,
                insumo_id=d.insumo_id,
                cantidad_gramos=d.cantidad_gramos,
                tipo_uso=d.tipo_uso.value,
                aditivo_id=d.aditivo_id
            )
        )

    for idx, p in enumerate(version_receta.pasos, start=1):
        paso_obj = PasoReceta(
            receta_id=receta_id,
            version=nueva_nro_version,
            orden=p.orden or idx,
            nombre_paso=p.nombre_paso,
            procedimiento=p.procedimiento,
            equipo_id=p.equipo_id,
            tiempo_minutos=p.tiempo_minutos,
            temperatura_celsius=p.temperatura_celsius,
            es_punto_control=p.es_punto_control
        )
        db.add(paso_obj)

    db.commit()
    db.refresh(nueva_version)
    return nueva_version

def leer_version_receta(db: Session, receta_id: int, nro_version: int) -> VersionReceta:
    leer_receta(db, receta_id)
    version = db.scalar(
        select(VersionReceta).where(
            VersionReceta.receta_id == receta_id,
            VersionReceta.version == nro_version
        )
    )
    if not version:
        raise exceptions.VersionNoEncontrada()
    return version

def marcar_version_receta_vigente(db: Session, receta_id: int, nro_version: int) -> VersionReceta:
    version = leer_version_receta(db, receta_id, nro_version)

    db.execute(
        update(VersionReceta)
        .where(VersionReceta.receta_id == receta_id)
        .values(estado=EstadoVersionReceta.ARCHIVADO)
    )

    version.estado = EstadoVersionReceta.ACTIVO
    version.fecha_vigencia = date.today()
    db.commit()
    db.refresh(version)
    return version

def _obtener_receta_vigente(db: Session, producto_id: int) -> VersionReceta:
    consulta= (
        select(VersionReceta)
        .join(Receta, VersionReceta.receta_id == Receta.id)
        .where(
            Receta.producto_id == producto_id,
            VersionReceta.estado == EstadoVersionReceta.ACTIVO
        )
    )
    version_vigente = db.scalars(consulta).first()

    if not version_vigente:
        raise exceptions.RecetaVigenteNoEncontrada()
    
    return version_vigente

def calcular_receta_escalada(
        db: Session, producto_id: int, payload: schemas.RecetaEscaladaBase
) -> schemas.RecetaEscalada:
    version_receta = _obtener_receta_vigente(db, producto_id)
    unidad_gramos = unidades_services.unidad_base(db, MagnitudUnidad.MASA)

    rendimiento_base = version_receta.rendimiento_final_gramos
    if(payload.factor is None) == (payload.cantidad_objetivo is None):
        raise exceptions.ParametrosEscaladoInvalidos()

    if rendimiento_base <= 0:
        raise exceptions.RendimientoFinalInvalido()

    if payload.cantidad_objetivo is not None:
        factor = payload.cantidad_objetivo / rendimiento_base
        rendimiento_esperado = round(payload.cantidad_objetivo, DECIMALES_ESCALADO)
    elif payload.factor is not None:
        factor = payload.factor
        rendimiento_esperado = round(rendimiento_base * factor, DECIMALES_ESCALADO)
    else: raise exceptions.ParametrosEscaladoInvalidos()

    consulta_detalles = (
        select(DetalleReceta, Insumo)
        .join(Insumo, DetalleReceta.insumo_id == Insumo.id)
        .where(
            DetalleReceta.receta_id == version_receta.receta_id,
            DetalleReceta.nro_version == version_receta.version
        )
        .order_by(DetalleReceta.renglon)
    )
    filas_detalle = db.execute(consulta_detalles).all()

    renglones_escalados = []
    for detalle, insumo in filas_detalle:
        cantidad_orig= detalle.cantidad_gramos
        cantidad_escalada = round(cantidad_orig * factor, DECIMALES_ESCALADO)
        stock_disponible = round(insumo.cantidad or 0.0, DECIMALES_ESCALADO)

        renglones_escalados.append(
            schemas.RenglonEscalado(
                insumo_id=insumo.id,
                insumo_nombre=insumo.nombre,
                unidad_medida_id=unidad_gramos.id,
                unidad_medida_nombre=unidad_gramos.nombre,
                magnitud=unidad_gramos.magnitud,
                cantidad_original=round(cantidad_orig, DECIMALES_ESCALADO),
                cantidad_escalada=cantidad_escalada,
                stock_disponible=stock_disponible,
                stock_suficiente=stock_disponible >= cantidad_escalada
            )
        )

        return schemas.RecetaEscalada(
            receta_id=version_receta.receta_id,
            receta_version_id=version_receta.version,
            producto_id=producto_id,
            rendimiento_original=round(rendimiento_base, DECIMALES_ESCALADO),
            rendimiento_esperado=rendimiento_esperado,
            unidad_producto_nombre=unidad_gramos.nombre,
            factor_aplicado=round(factor, DECIMALES_FACTOR),
            renglones=renglones_escalados
        )