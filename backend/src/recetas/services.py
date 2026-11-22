import logging
from datetime import date
from typing import List, Optional, Any
from sqlalchemy import select, func, update, insert
from sqlalchemy.orm import Session

from src.recetas.models import Receta, VersionReceta, PasoReceta, detalle_receta
from src.recetas import schemas, exceptions
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo
from src.productos.models import Producto
from src.insumos.models import Insumo
from src.datos_nutricionales.models import DatoNutricionalInsumo, ValorDiarioReferencia
from src.datos_nutricionales.constants import Nutriente
from src.datos_nutricionales import services as datos_nutricionales_services

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

def _expresar_valor(valor: float, umbral: float, decimales: int, unidad: str) -> str:
    if valor < umbral:
        return "0 " + unidad if unidad else "0"
    if decimales == 0:
        return f"{int(round(valor))} {unidad}".strip()
    return f"{round(valor, decimales)} {unidad}".strip()


# nuevo ######################################

def revisar_faltantes_receta(
    db: Session, renglones: List[Any]
) -> List[schemas.FaltanteNutricionalInsumo]:
    """Revisa cada renglón de la receta y arma la lista de faltantes:
    insumo, qué dato falta y si no tiene fuente registrada.
    Aplica la regla de aditivos: solo cuentan como incompletos si tienen
    marca de aporte y les falta energía o sodio.
    """
    from src.rotulado_frontal.models import MarcaInsumo

    faltantes: List[schemas.FaltanteNutricionalInsumo] = []
    insumo_ids = list({r.insumo_id for r in renglones})
    if not insumo_ids:
        return faltantes

    insumos = {i.id: i for i in db.scalars(select(Insumo).where(Insumo.id.in_(insumo_ids))).all()}
    marcas = {m.insumo_id: m for m in db.scalars(select(MarcaInsumo).where(MarcaInsumo.insumo_id.in_(insumo_ids))).all()}

    todos_datos = db.scalars(
        select(DatoNutricionalInsumo).where(DatoNutricionalInsumo.insumo_id.in_(insumo_ids))
    ).all()
    datos_por_insumo: dict[int, dict[Nutriente, DatoNutricionalInsumo]] = {}
    for d in todos_datos:
        datos_por_insumo.setdefault(d.insumo_id, {})[d.nutriente] = d

    vistos = set()
    for r in renglones:
        insumo_id = r.insumo_id
        tipo_uso = r.tipo_uso
        tipo_uso_val = tipo_uso.value if hasattr(tipo_uso, "value") else str(tipo_uso)

        clave = (insumo_id, tipo_uso_val)
        if clave in vistos:
            continue
        vistos.add(clave)

        insumo = insumos.get(insumo_id)
        insumo_nombre = insumo.nombre if insumo else f"Insumo #{insumo_id}"
        datos_insumo = datos_por_insumo.get(insumo_id, {})
        marca = marcas.get(insumo_id)

        datos_faltantes: List[str] = []
        sin_fuente: List[str] = []

        if tipo_uso_val == TipoUsoInsumo.ADITIVO.value:
            # REGLA DE ADITIVOS: solo cuentan como incompletos si tienen marca de
            # aporte y les falta energía o sodio.
            aporta_sodio = bool(marca and marca.agrega_sodio)
            aporta_energia = bool(marca and (marca.agrega_azucares or marca.agrega_grasas))

            if aporta_energia:
                dato_e = datos_insumo.get(Nutriente.ENERGIA)
                if not dato_e or dato_e.valor is None:
                    datos_faltantes.append(Nutriente.ENERGIA.value)
                elif not dato_e.fuente:
                    sin_fuente.append(Nutriente.ENERGIA.value)

            if aporta_sodio:
                dato_s = datos_insumo.get(Nutriente.SODIO)
                if not dato_s or dato_s.valor is None:
                    datos_faltantes.append(Nutriente.SODIO.value)
                elif not dato_s.fuente:
                    sin_fuente.append(Nutriente.SODIO.value)
        else:
            # INGREDIENTE: los 10 nutrientes obligatorios deben estar presentes con valor y fuente
            for nut in Nutriente:
                dato = datos_insumo.get(nut)
                if not dato or dato.valor is None:
                    datos_faltantes.append(nut.value)
                elif not dato.fuente:
                    sin_fuente.append(nut.value)

        if datos_faltantes or sin_fuente:
            faltantes.append(
                schemas.FaltanteNutricionalInsumo(
                    insumo_id=insumo_id,
                    insumo_nombre=insumo_nombre,
                    tipo_uso=tipo_uso_val,
                    datos_faltantes=datos_faltantes,
                    sin_fuente=sin_fuente,
                )
            )

    return faltantes

###############################################3

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


    # nuevo, revisar si falta algo y ponerle el estado que corresponda
    faltantes = revisar_faltantes_receta(db, renglones)
    estado = EstadoTablaNutricional.INCOMPLETA if faltantes else EstadoTablaNutricional.COMPLETA
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
        estado=estado,        ## nuevo
        faltantes=faltantes,  ##nuevo
        items=items_res
    )
