import logging
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import select, func, update, insert
from sqlalchemy.orm import Session

from src.recetas.models import Receta, VersionReceta, PasoReceta, DetalleReceta, ConfiguracionProduccion, detalle_receta
from src.recetas import schemas, exceptions
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo, FormatoDeclaracionAditivos, DECIMALES_ESCALADO, DECIMALES_FACTOR
from src.productos.models import Producto
from src.insumos.models import Insumo
from src.aditivos.models import Aditivo, ClaseFuncionalAditivo
from src.empleados import services as empleados_services
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

    version_anterior = db.scalar(
        select(VersionReceta).where(
            VersionReceta.receta_id == receta_id,
            VersionReceta.estado == EstadoVersionReceta.ACTIVO,
        )
    )
    orden_heredado = None
    orden_por_heredado = None
    orden_fecha_heredada = None
    aviso_orden = None

    if version_anterior and version_anterior.orden_ingredientes_manual:
        total_ant = sum(d.cantidad_gramos for d in version_anterior.detalles)
        pct_ant = {
            d.insumo_id: round((d.cantidad_gramos / total_ant) * 100, 4) if total_ant > 0 else 0.0
            for d in version_anterior.detalles
            if d.tipo_uso == TipoUsoInsumo.INGREDIENTE
        }
        total_nuevo = sum(d.cantidad_gramos for d in version_receta.detalles)
        pct_nuevo = {
            d.insumo_id: round((d.cantidad_gramos / total_nuevo) * 100, 4) if total_nuevo > 0 else 0.0
            for d in version_receta.detalles
            if d.tipo_uso == TipoUsoInsumo.INGREDIENTE
        }
        if pct_ant == pct_nuevo:
            orden_heredado = version_anterior.orden_ingredientes_manual
            orden_por_heredado = version_anterior.orden_manual_por_id
            orden_fecha_heredada = version_anterior.orden_manual_fecha
        else:
            aviso_orden = (
                "La versión anterior tenía un ajuste manual de orden. "
                "Se volvió al orden automático porque cambiaron los porcentajes."
            )

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
        fecha_vigencia=version_receta.fecha_vigencia or date.today(),
        orden_ingredientes_manual=orden_heredado,
        orden_manual_por_id=orden_por_heredado,
        orden_manual_fecha=orden_fecha_heredada,
        aviso_orden_anterior=aviso_orden,
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

def obtener_configuracion_produccion(db: Session) -> ConfiguracionProduccion:
    config = db.scalar(select(ConfiguracionProduccion))
    if not config:
        config = ConfiguracionProduccion(
            formato_declaracion_aditivos=FormatoDeclaracionAditivos.FUNCION_AMBOS
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def actualizar_configuracion_produccion(
        db: Session,
        datos: schemas.ConfiguracionProduccionUpdate,
) -> ConfiguracionProduccion:
    config = obtener_configuracion_produccion(db)
    config.formato_declaracion_aditivos = datos.formato_declaracion_aditivos
    db.commit()
    db.refresh(config)
    return config

def _formatear_aditivo_individual(aditivo: Aditivo, formato: FormatoDeclaracionAditivos) -> str:
    nombre = aditivo.nombre_completo.strip()
    ins = f"INS {aditivo.numero_ins.strip()}" if aditivo.numero_ins else None
    if formato == FormatoDeclaracionAditivos.FUNCION_NOMBRE or not ins:
        return nombre
    if formato == FormatoDeclaracionAditivos.FUNCION_INS:
        return ins
    return f"{nombre} ({ins})"

def obtener_lista_ingredientes_rotulo(
        db: Session,
        receta_id: int,
        nro_version: Optional[int] = None,
) -> schemas.ListaIngredientesRotuloResponse:
    version_obj = (
        leer_version_receta(db, receta_id, nro_version)
        if nro_version is not None
        else obtener_version_vigente(db, receta_id)
    )
    config = obtener_configuracion_produccion(db)
    formato = config.formato_declaracion_aditivos

    stmt = (
        select(
            detalle_receta.c.renglon,
            detalle_receta.c.insumo_id,
            detalle_receta.c.cantidad_gramos,
            detalle_receta.c.tipo_uso,
            detalle_receta.c.aditivo_id,
            Insumo.nombre.label("insumo_nombre"),
            Insumo.denominacion_rotulo.label("denominacion_rotulo"),
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

    ingredientes_raw: List[schemas.IngredienteRotuloItem] = []
    aditivos_rows = []

    for r in renglones:
        porcentaje = round((r.cantidad_gramos / total_gramos) * 100, 4) if total_gramos > 0 else 0.0
        if r.tipo_uso == TipoUsoInsumo.INGREDIENTE:
            denom = (r.denominacion_rotulo or "").strip() or r.insumo_nombre
            ingredientes_raw.append(
                schemas.IngredienteRotuloItem(
                    insumo_id=r.insumo_id,
                    nombre_insumo=r.insumo_nombre,
                    denominacion_rotulo=denom,
                    cantidad_gramos=r.cantidad_gramos,
                    porcentaje=porcentaje,
                    renglon_original=r.renglon,
                )
            )
        elif r.tipo_uso == TipoUsoInsumo.ADITIVO and r.aditivo_id is not None:
            aditivos_rows.append(r)

    ingredientes_auto = sorted(
        ingredientes_raw,
        key=lambda item: (-item.porcentaje, item.renglon_original),
    )

    es_manual = False
    if version_obj.orden_ingredientes_manual:
        ids_actuales = {item.insumo_id for item in ingredientes_auto}
        orden_guardado = [iid for iid in version_obj.orden_ingredientes_manual if iid in ids_actuales]
        if len(orden_guardado) == len(ingredientes_auto):
            pos = {iid: idx for idx, iid in enumerate(orden_guardado)}
            ingredientes_ordenados = sorted(ingredientes_auto, key=lambda item: pos[item.insumo_id])
            es_manual = True
        else:
            ingredientes_ordenados = ingredientes_auto
    else:
        ingredientes_ordenados = ingredientes_auto

    grupos_map: dict[int, schemas.GrupoAditivosRotulo] = {}
    orden_grupos: List[int] = []

    if aditivos_rows:
        ids_aditivos = [r.aditivo_id for r in aditivos_rows]
        filas_aditivos = db.execute(
            select(Aditivo, ClaseFuncionalAditivo)
            .join(ClaseFuncionalAditivo, ClaseFuncionalAditivo.id == Aditivo.clase_funcional_id)
            .where(Aditivo.id.in_(ids_aditivos))
        ).all()
        aditivos_dict = {ad.id: (ad,cf) for ad, cf in filas_aditivos}

        for r in aditivos_rows:
            par = aditivos_dict.get(r.aditivo_id)
            if not par:
                continue
            aditivo_obj, clase_obj = par
            es_aromatizante = (not clase_obj.necesita_ins) or ("aromatizante" in clase_obj.nombre.lower())

            if clase_obj.id not in grupos_map:
                orden_grupos.append(clase_obj.id)
                grupos_map[clase_obj.id] = schemas.GrupoAditivosRotulo(
                    clase_funcional_id=clase_obj.id,
                    clase_funcional=clase_obj.nombre,
                    es_aromatizante=es_aromatizante,
                    texto_grupo=clase_obj.nombre,
                    aditivos=[],
                )

            texto_indiv = (
                clase_obj.nombre
                if es_aromatizante
                else _formatear_aditivo_individual(aditivo_obj, formato)
            )
            grupos_map[clase_obj.id].aditivos.append(
                schemas.AditivoRotuloItem(
                    aditivo_id=aditivo_obj.id,
                    insumo_id=r.insumo_id,
                    nombre_completo=aditivo_obj.nombre_completo,
                    numero_ins=aditivo_obj.numero_ins,
                    texto_formateado=texto_indiv,
                )
            )

    grupos_aditivos: List[schemas.GrupoAditivosRotulo] = []
    for cid in orden_grupos:
        grupo = grupos_map[cid]
        if grupo.es_aromatizante:
            grupo.texto_grupo = grupo.clase_funcional
        else:
            detalles_str = ", ".join(a.texto_formateado for a in grupo.aditivos)
            grupo.texto_grupo = f"{grupo.clase_funcional}: {detalles_str}"
        grupos_aditivos.append(grupo)

    partes_rotulo = [ing.denominacion_rotulo for ing in ingredientes_ordenados]
    partes_rotulo.extend(grp.texto_grupo for grp in grupos_aditivos)
    texto_rotulo = f"Ingredientes: {', '.join(partes_rotulo)}." if partes_rotulo else ""

    return schemas.ListaIngredientesRotuloResponse(
        receta_id=receta_id,
        version=version_obj.version,
        es_orden_manual= es_manual,
        orden_manual_por=version_obj.orden_manual_por,
        orden_manual_fecha=version_obj.orden_manual_fecha,
        aviso_orden_anterior=version_obj.aviso_orden_anterior,
        formato_aditivos=formato,
        ingredientes=ingredientes_ordenados,
        grupos_aditivos=grupos_aditivos,
        texto_rotulo=texto_rotulo,
    )

def guardar_orden_manual_ingredientes(
    db: Session,
    receta_id: int,
    nro_version: int,
    payload: schemas.AjusteOrdenIngredientesPayload,
) -> schemas.ListaIngredientesRotuloResponse:
    version_obj = leer_version_receta(db, receta_id, nro_version)
    if version_obj.estado != EstadoVersionReceta.ACTIVO:
        raise exceptions.VersionNoEncontrada()
    
    actual = obtener_lista_ingredientes_rotulo(db, receta_id, nro_version)

    ids_esperados = {item.insumo_id for item in actual.ingredientes}
    if len(payload.orden_insumo_ids) != len(ids_esperados) or set(payload.orden_insumo_ids) != ids_esperados:
        raise exceptions.InsumoDuplicado()

    if payload.empleado_id is not None:
        empleados_services.leer_empleado(db, payload.empleado_id)

    version_obj.orden_ingredientes_manual = payload.orden_insumo_ids
    version_obj.orden_manual_por_id = payload.empleado_id
    version_obj.orden_manual_fecha = datetime.now()
    version_obj.aviso_orden_anterior = None

    db.commit()
    return obtener_lista_ingredientes_rotulo(db, receta_id, nro_version)

def restablecer_orden_automatico_ingredientes(
    db: Session,
    receta_id: int,
    nro_version: int,    
) -> schemas.ListaIngredientesRotuloResponse:
    version_obj = leer_version_receta(db, receta_id, nro_version)
    if version_obj.estado != EstadoVersionReceta.ACTIVO:
        raise exceptions.VersionNoEncontrada()
    
    version_obj.orden_ingredientes_manual = None
    version_obj.orden_manual_por_id = None
    version_obj.orden_manual_fecha = None
    version_obj.aviso_orden_anterior = None

    db.commit()
    return obtener_lista_ingredientes_rotulo(db, receta_id, nro_version)
