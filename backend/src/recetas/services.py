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
from src.aditivos.models import Aditivo
from src.unidades_medida import services as unidades_services
from src.unidades_medida.constants import MagnitudUnidad
from src.datos_nutricionales.models import DatoNutricionalInsumo, ValorDiarioReferencia
from src.datos_nutricionales.constants import Nutriente
from src.datos_nutricionales import services as datos_nutricionales_services

logger = logging.getLogger(__name__)

def _validar_detalles_y_rendimientos(
    db: Session,
    producto_id: int,
    rendimiento_final_gramos: float,
    unidad_venta_gramos: float,
    detalles: List[schemas.DetalleRecetaCreate]
):
    producto = db.scalar(select(Producto).where(Producto.id == producto_id))
    if not producto:
        raise exceptions.RecetaNoEncontrada()
    if getattr(producto, "activo", True) is False:
        raise exceptions.ProductoInactivo()

    if rendimiento_final_gramos <= 0:
        raise exceptions.RendimientoFinalInvalido()
    if unidad_venta_gramos <= 0:
        raise exceptions.UnidadVentaInvalida()
    if not detalles:
        raise exceptions.VersionInicialRequerida()

    tiene_ingrediente = any(d.tipo_uso == TipoUsoInsumo.INGREDIENTE for d in detalles)
    if not tiene_ingrediente:
        raise exceptions.TipoUsoInvalido()

    insumo_ids = [d.insumo_id for d in detalles]
    if len(insumo_ids) != len(set(insumo_ids)):
        raise exceptions.InsumoDuplicado()

    insumos_db = db.scalars(select(Insumo).where(Insumo.id.in_(insumo_ids))).all()
    insumos_dict = {ins.id: ins for ins in insumos_db}

    for d in detalles:
        if d.cantidad_gramos <= 0:
            raise exceptions.RendimientoFinalInvalido()

        insumo = insumos_dict.get(d.insumo_id)
        if not insumo or not insumo.activo:
            raise exceptions.InsumoInactivo()

        if d.tipo_uso == TipoUsoInsumo.ADITIVO:
            if not d.aditivo_id:
                raise exceptions.AditivoRequerido()
            aditivo_db = db.scalar(select(Aditivo).where(Aditivo.id == d.aditivo_id))
            if not aditivo_db:
                raise exceptions.AditivoRequerido()

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
        db,
        datos.producto_id,
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
        db,
        receta.producto_id,
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
def _expresar_valor(valor: float, umbral: float, decimales: int, unidad: str) -> str:
    if valor < umbral:
        return "0 " + unidad if unidad else "0"
    if decimales == 0:
        return f"{int(round(valor))} {unidad}".strip()
    return f"{round(valor, decimales)} {unidad}".strip()

def calcular_informacion_nutricional_receta(
    db: Session, receta_id: int, nro_version: Optional[int] = None
) -> schemas.TablaNutricionalRecetaResponse:
    if nro_version is not None:
        version_obj = leer_version_receta(db, receta_id, nro_version)
    else:
        version_obj = obtener_version_vigente(db, receta_id)

    stmt_detalles = select(detalle_receta).where(
        detalle_receta.c.receta_id == receta_id,
        detalle_receta.c.nro_version == version_obj.version
    )
    renglones = db.execute(stmt_detalles).fetchall()

    vds = {v.nutriente: v for v in datos_nutricionales_services.obtener_valores_diarios_referencia(db)}
    aportes_totales = {nut: 0.0 for nut in Nutriente}

    for r in renglones:
        insumo_id = r.insumo_id
        cantidad_g = r.cantidad_gramos
        datos_insumo = db.scalars(
            select(DatoNutricionalInsumo).where(DatoNutricionalInsumo.insumo_id == insumo_id)
        ).all()
        for dato in datos_insumo:
            if dato.nutriente in aportes_totales and dato.valor:
                aportes_totales[dato.nutriente] += (cantidad_g / 100.0) * dato.valor

    rendimiento = version_obj.rendimiento_final_gramos or 1000.0
    porcion = version_obj.unidad_venta_gramos or 250.0

    items_res: List[schemas.ItemInformacionNutricionalResponse] = []

    for nut in Nutriente:
        vd_config = vds.get(nut)
        unidad = vd_config.unidad if vd_config else "g"
        umbral = vd_config.umbral_no_significativo if vd_config else 0.0
        decimales = vd_config.decimales if vd_config else 1
        vd_ref = vd_config.valor_diario if vd_config else None

        tot_aporte = aportes_totales.get(nut, 0.0)

        val_100g_raw = (tot_aporte / rendimiento) * 100.0
        val_100g_exp = _expresar_valor(val_100g_raw, umbral, decimales, unidad)

        val_porcion_raw = (val_100g_raw / 100.0) * porcion
        val_porcion_exp = _expresar_valor(val_porcion_raw, umbral, decimales, unidad)

        pct_vd = None
        pct_vd_exp = "-"
        if vd_ref and vd_ref > 0:
            pct_vd = (val_porcion_raw / vd_ref) * 100.0
            if val_porcion_raw < umbral:
                pct_vd_exp = "0%"
            else:
                pct_vd_exp = f"{int(round(pct_vd))}%"

        items_res.append(
            schemas.ItemInformacionNutricionalResponse(
                nutriente=nut.value,
                unidad=unidad,
                valor_100g_raw=round(val_100g_raw, 4),
                valor_100g_expresado=val_100g_exp,
                valor_porcion_raw=round(val_porcion_raw, 4),
                valor_porcion_expresado=val_porcion_exp,
                porcentaje_vd=round(pct_vd, 2) if pct_vd is not None else None,
                porcentaje_vd_expresado=pct_vd_exp
            )
        )

    return schemas.TablaNutricionalRecetaResponse(
        receta_id=receta_id,
        version=version_obj.version,
        rendimiento_final_gramos=rendimiento,
        unidad_venta_gramos=porcion,
        medida_casera=version_obj.medida_casera,
        items=items_res
    )
def calcular_composicion_receta(
    db: Session, receta_id: int, nro_version: Optional[int] = None
) -> schemas.ComposicionRecetaResponse:
    if nro_version is not None:
        version_obj = leer_version_receta(db, receta_id, nro_version)
    else:
        version_obj = obtener_version_vigente(db, receta_id)

    stmt = (
        select(
            detalle_receta.c.renglon,
            detalle_receta.c.insumo_id,
            detalle_receta.c.cantidad_gramos,
            detalle_receta.c.tipo_uso,
            detalle_receta.c.aditivo_id,
            Insumo.nombre.label("nombre_insumo"),
        )
        .join(Insumo, detalle_receta.c.insumo_id == Insumo.id)
        .where(
            detalle_receta.c.receta_id == receta_id,
            detalle_receta.c.nro_version == version_obj.version,
        )
        .order_by(detalle_receta.c.renglon)
    )

    renglones = db.execute(stmt).fetchall()

    total_gramos = sum(r.cantidad_gramos for r in renglones)

    ingredientes = []
    aditivos = []

    for r in renglones:
        porcentaje = (
            (r.cantidad_gramos / total_gramos) * 100
            if total_gramos > 0
            else 0.0
        )

        item = schemas.ItemComposicionResponse(
            renglon=r.renglon,
            insumo_id=r.insumo_id,
            nombre_insumo=r.nombre_insumo,
            cantidad_gramos=r.cantidad_gramos,
            porcentaje=round(porcentaje, 4),
            tipo_uso=r.tipo_uso,
            aditivo_id=r.aditivo_id,
        )

        if r.tipo_uso == TipoUsoInsumo.INGREDIENTE:
            ingredientes.append(item)
        elif r.tipo_uso == TipoUsoInsumo.ADITIVO:
            aditivos.append(item)

    suma_porcentajes = sum(
        item.porcentaje for item in ingredientes + aditivos
    )

    suma_correcta = (
        total_gramos > 0
        and abs(suma_porcentajes - 100.0) <= 0.01
    )

    return schemas.ComposicionRecetaResponse(
        receta_id=receta_id,
        version=version_obj.version,
        total_gramos=round(total_gramos, 4),
        ingredientes=ingredientes,
        aditivos=aditivos,
        suma_porcentajes=round(suma_porcentajes, 4),
        suma_correcta=suma_correcta,
    )
