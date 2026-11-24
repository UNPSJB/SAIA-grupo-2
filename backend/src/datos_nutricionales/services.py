from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.alimentos_referencia import services as alimentos_services
from src.datos_nutricionales import exceptions, schemas
from src.datos_nutricionales.constants import (
    TOLERANCIA_MODIFICACION,
    FuenteDatoNutricional,
    Nutriente,
    LEYENDA_TABLA_NUTRICIONAL,
    NOTA_PIE_VALORES_DIARIOS,
    NUTRIENTES_TABLA_NORMATIVA,
    EstadoTablaNutricional,
)
from src.datos_nutricionales.models import DatoNutricionalInsumo, ValorDiarioReferencia
from src.empleados import services as empleados_services
from src.empleados.models import Empleado
from src.insumos import services as insumos_services
from src.insumos.models import Insumo

ORDEN_NUTRIENTES = {nutriente: posicion for posicion, nutriente in enumerate(Nutriente)}

VALORES_DIARIOS_DEFAULT = [
    (Nutriente.ENERGIA, 2000.0, "kcal", 4.0, 0),
    (Nutriente.CARBOHIDRATOS, 300.0, "g", 0.5, 1),
    (Nutriente.AZUCARES_TOTALES, None, "g", 0.5, 1),
    (Nutriente.AZUCARES_ANADIDOS, None, "g", 0.5, 1),
    (Nutriente.PROTEINAS, 75.0, "g", 0.5, 1),
    (Nutriente.GRASAS_TOTALES, 55.0, "g", 0.5, 1),
    (Nutriente.GRASAS_SATURADAS, 22.0, "g", 0.5, 1),
    (Nutriente.GRASAS_TRANS, None, "g", 0.1, 1),
    (Nutriente.FIBRA_ALIMENTARIA, 25.0, "g", 0.5, 1),
    (Nutriente.SODIO, 2400.0, "mg", 5.0, 0),
]


def _distintos(a: float, b: float) -> bool:
    return abs(a - b) > TOLERANCIA_MODIFICACION


def _datos_del_insumo(db: Session, insumo_id: int) -> List[DatoNutricionalInsumo]:
    datos = db.scalars(select(DatoNutricionalInsumo).where(DatoNutricionalInsumo.insumo_id == insumo_id)).all()
    return sorted(datos, key=lambda dato: ORDEN_NUTRIENTES[dato.nutriente])


def _resumen_insumo(insumo: Insumo) -> schemas.InsumoResumen:
    return schemas.InsumoResumen(
        id=insumo.id, nombre=insumo.nombre, activo=insumo.activo, magnitud=insumo.unidad_medida.magnitud
    )


def obtener_datos_insumo(db: Session, insumo_id: int) -> schemas.DatosNutricionalesInsumo:
    insumo = insumos_services.leer_insumo(db, insumo_id)
    return schemas.DatosNutricionalesInsumo(
        insumo=_resumen_insumo(insumo),
        datos=[schemas.DatoNutricional.model_validate(dato) for dato in _datos_del_insumo(db, insumo_id)],
    )


def _origen(entrada: schemas.DatoNutricionalEntrada) -> tuple:
    if entrada.fuente == FuenteDatoNutricional.SARA:
        return (entrada.fuente, entrada.alimento_codigo, None)
    return (entrada.fuente, None, entrada.referencia or None)


def _valor_de_la_sara(db: Session, entrada: schemas.DatoNutricionalEntrada) -> float:
    if not entrada.alimento_codigo:
        raise exceptions.ReferenciaObligatoria()
    alimento = alimentos_services.leer_alimento(db, entrada.alimento_codigo)
    valor = alimentos_services.valor_de(alimento, entrada.nutriente)
    if valor is None:
        raise exceptions.DatoNoInformado()
    return valor


def _registrar_modificacion(dato: DatoNutricionalInsumo, empleado: Empleado, momento: datetime) -> None:
    dato.modificado = _distintos(dato.valor, dato.valor_fuente)
    dato.modificado_por = empleado if dato.modificado else None
    dato.fecha_modificacion = momento if dato.modificado else None


def cargar_datos(
    db: Session, insumo_id: int, carga: schemas.CargaDatosNutricionales
) -> schemas.DatosNutricionalesInsumo:
    insumos_services.leer_insumo(db, insumo_id)
    empleado = empleados_services.leer_empleado(db, carga.empleado_id)

    nutrientes = [entrada.nutriente for entrada in carga.datos]
    if len(nutrientes) != len(set(nutrientes)):
        raise exceptions.NutrienteRepetido()

    existentes = {dato.nutriente: dato for dato in _datos_del_insumo(db, insumo_id)}
    ahora = datetime.now()

    try:
        for entrada in carga.datos:
            actual = existentes.get(entrada.nutriente)

            if entrada.valor is None:
                if actual is not None:
                    db.delete(actual)
                continue

            if entrada.valor < 0:
                raise exceptions.ValorNegativo()

            fuente, alimento_codigo, referencia = _origen(entrada)
            misma_carga = actual is not None and (actual.fuente, actual.alimento_codigo, actual.referencia) == (
                fuente,
                alimento_codigo,
                referencia,
            )

            if misma_carga:
                if _distintos(actual.valor, entrada.valor):
                    actual.valor = entrada.valor
                    _registrar_modificacion(actual, empleado, ahora)
                continue

            valor_fuente = (
                _valor_de_la_sara(db, entrada) if fuente == FuenteDatoNutricional.SARA else entrada.valor
            )
            dato = actual or DatoNutricionalInsumo(insumo_id=insumo_id, nutriente=entrada.nutriente)
            dato.fuente = fuente
            dato.alimento_codigo = alimento_codigo
            dato.referencia = referencia
            dato.valor_fuente = valor_fuente
            dato.valor = entrada.valor
            dato.fecha_carga = ahora
            dato.cargado_por = empleado
            _registrar_modificacion(dato, empleado, ahora)
            db.add(dato)
    except Exception:
        db.rollback()
        raise

    db.commit()
    recalcular_versiones_afectadas(db, insumo_id)
    return obtener_datos_insumo(db, insumo_id)


def obtener_versiones_afectadas(db: Session, insumo_id: int) -> List[Tuple[int, int]]:
    try:
        from src.asociaciones.detalle_receta import detalle_receta
        renglones = db.execute(
            select(detalle_receta.c.receta_id, detalle_receta.c.nro_version)
            .where(detalle_receta.c.insumo_id == insumo_id)
            .distinct()
        ).all()
        return [(r.receta_id, r.nro_version) for r in renglones]
    except Exception:
        return []
def recalcular_versiones_afectadas(db: Session, insumo_id: int):
    """Recalcula automáticamente las versiones de recetas afectadas al completar o modificar un dato nutricional."""
    try:
        from src.recetas import services as recetas_services
        versiones = obtener_versiones_afectadas(db, insumo_id)
        for receta_id, nro_version in versiones:
            recetas_services.calcular_informacion_nutricional_receta(db, receta_id, nro_version)
    except Exception:
        pass


def resumen_por_insumo(db: Session) -> List[schemas.ResumenNutricionalInsumo]:
    insumos = db.scalars(select(Insumo).where(Insumo.activo.is_(True)).order_by(Insumo.nombre)).all()
    datos_por_insumo: Dict[int, List[DatoNutricionalInsumo]] = {}
    for dato in db.scalars(select(DatoNutricionalInsumo)).all():
        datos_por_insumo.setdefault(dato.insumo_id, []).append(dato)

    resumen = []
    for insumo in insumos:
        datos = datos_por_insumo.get(insumo.id, [])
        fechas: List[Optional[datetime]] = [d.fecha_carga for d in datos] + [d.fecha_modificacion for d in datos]
        fechas_validas = [fecha for fecha in fechas if fecha is not None]
        resumen.append(
            schemas.ResumenNutricionalInsumo(
                insumo=_resumen_insumo(insumo),
                cargados=len(datos),
                total=len(Nutriente),
                modificados=sum(1 for dato in datos if dato.modificado),
                fuentes=sorted({dato.fuente for dato in datos}, key=lambda f: list(FuenteDatoNutricional).index(f)),
                ultima_actualizacion=max(fechas_validas) if fechas_validas else None,
            )
        )
    return resumen


def obtener_valores_diarios_referencia(db: Session) -> List[ValorDiarioReferencia]:
    vds = db.scalars(select(ValorDiarioReferencia)).all()
    if not vds:
        for nut, vd_val, un, umbral, dec in VALORES_DIARIOS_DEFAULT:
            db.add(ValorDiarioReferencia(
                nutriente=nut,
                valor_diario=vd_val,
                unidad=un,
                umbral_no_significativo=umbral,
                decimales=dec
            ))
        db.commit()
        vds = db.scalars(select(ValorDiarioReferencia)).all()
    return sorted(vds, key=lambda x: ORDEN_NUTRIENTES[x.nutriente])


def actualizar_valor_diario_referencia(
    db: Session, nutriente: Nutriente, datos: schemas.ValorDiarioReferenciaUpdate
) -> ValorDiarioReferencia:
    vds = {v.nutriente: v for v in obtener_valores_diarios_referencia(db)}
    vd = vds.get(nutriente)
    if not vd:
        vd = ValorDiarioReferencia(nutriente=nutriente)
        db.add(vd)

    if datos.valor_diario is not None:
        vd.valor_diario = datos.valor_diario
    if datos.unidad is not None:
        vd.unidad = datos.unidad
    if datos.umbral_no_significativo is not None:
        vd.umbral_no_significativo = datos.umbral_no_significativo
    if datos.decimales is not None:
        vd.decimales = datos.decimales

    db.commit()
    db.refresh(vd)
    return vd


def _expresar_segun_configuracion(valor: float, configuracion: Optional[ValorDiarioReferencia]) -> float:
    """Aplica el umbral de "no significativo" y los decimales configurados para el nutriente."""
    if configuracion is None:
        return round(valor, 2)
    if valor < configuracion.umbral_no_significativo:
        return 0.0
    return round(valor, configuracion.decimales)


def obtener_informacion_nutricional_producto(
    db: Session,
    producto_id: int,
    porcion: Optional[float] = None,
    medida_casera: Optional[str] = None,
) -> schemas.InformacionNutricionalProducto:
    from src.productos import services as productos_services
    from src.productos.constants import TipoProducto
    from src.recetas.models import Receta, VersionReceta
    from src.asociaciones.detalle_receta import detalle_receta
    from src.exceptions import BadRequest
    from src.recetas.services import _convertir_a_gramos, revisar_faltantes_receta
    from src.lotes_produccion.models import LoteProduccion
    from src.asociaciones.lote_insumos import lote_insumo
    producto = productos_services.leer_producto(db, producto_id)
    unidad_base = "ml" if producto.tipo == TipoProducto.BEBIDA else "g"
    receta = db.scalar(select(Receta).where(Receta.producto_id == producto_id))
    version_activa = None
    renglones_receta = []
    rendimiento_gramos = 0.0
    unidad_venta_receta = None
    medida_casera_receta = None
    if receta:
        version_activa = db.scalar(
            select(VersionReceta)
            .where(VersionReceta.receta_id == receta.id, VersionReceta.estado == "activo")
            .order_by(VersionReceta.version.desc())
        )
        if not version_activa:
            version_activa = db.scalar(
                select(VersionReceta)
                .where(VersionReceta.receta_id == receta.id)
                .order_by(VersionReceta.version.desc())
            )
        if version_activa:
            rendimiento_gramos = version_activa.rendimiento_final_gramos or 0.0
            unidad_venta_receta = version_activa.unidad_venta_gramos
            medida_casera_receta = version_activa.medida_casera
            renglones_receta = db.execute(
                select(detalle_receta).where(
                    detalle_receta.c.receta_id == receta.id,
                    detalle_receta.c.nro_version == version_activa.version,
                )
            ).fetchall()
    faltantes: List[schemas.FaltanteNutricionalInsumo] = []
    composicion: List[Tuple[Insumo, float]] = []
    if renglones_receta:
        faltantes = revisar_faltantes_receta(db, renglones_receta)
        insumo_ids = [r.insumo_id for r in renglones_receta]
        insumos_map = {i.id: i for i in db.scalars(select(Insumo).where(Insumo.id.in_(insumo_ids))).all()}
        composicion = [(insumos_map[r.insumo_id], r.cantidad_gramos) for r in renglones_receta if r.insumo_id in insumos_map]
    else:
        consulta = (
            select(Insumo, lote_insumo.c.cantidad_utilizada, lote_insumo.c.unidad_medida_id)
            .join(lote_insumo, lote_insumo.c.insumo_id == Insumo.id)
            .join(LoteProduccion, LoteProduccion.nro_lote == lote_insumo.c.lote_id)
            .where(LoteProduccion.producto_id == producto_id)
            .order_by(Insumo.nombre)
        )
        gramos_por_insumo: dict[int, float] = {}
        insumos_lote: dict[int, Insumo] = {}
        sin_conversion: dict[int, Insumo] = {}
        for insumo, cantidad, unidad_medida_id in db.execute(consulta).all():
            if not cantidad or cantidad <= 0:
                continue
            try:
                gramos = _convertir_a_gramos(insumo, cantidad, unidad_medida_id, db)
            except BadRequest:
                sin_conversion[insumo.id] = insumo
                continue
            insumos_lote[insumo.id] = insumo
            gramos_por_insumo[insumo.id] = gramos_por_insumo.get(insumo.id, 0.0) + gramos
        items_lote = [(insumos_lote[insumo_id], gramos) for insumo_id, gramos in gramos_por_insumo.items()]
        for insumo in sin_conversion.values():
            faltantes.append(
                schemas.FaltanteNutricionalInsumo(
                    insumo_id=insumo.id,
                    insumo_nombre=insumo.nombre,
                    tipo_uso="ingrediente",
                    datos_faltantes=[],
                    sin_fuente=[],
                )
            )
        if items_lote:
            composicion = items_lote
            rendimiento_gramos = sum(cant for _, cant in items_lote)
            ids_lote = [i.id for i, _ in composicion]
            datos_lote = db.scalars(select(DatoNutricionalInsumo).where(DatoNutricionalInsumo.insumo_id.in_(ids_lote))).all()
            por_insumo: dict[int, dict[Nutriente, DatoNutricionalInsumo]] = {}
            for d in datos_lote:
                por_insumo.setdefault(d.insumo_id, {})[d.nutriente] = d
            for insumo, _ in composicion:
                d_insumo = por_insumo.get(insumo.id, {})
                d_falt = []
                s_fuente = []
                for nut in Nutriente:
                    d = d_insumo.get(nut)
                    if not d or d.valor is None:
                        d_falt.append(nut.value)
                    elif not d.fuente:
                        s_fuente.append(nut.value)
                if d_falt or s_fuente:
                    faltantes.append(
                        schemas.FaltanteNutricionalInsumo(
                            insumo_id=insumo.id,
                            insumo_nombre=insumo.nombre,
                            tipo_uso="ingrediente",
                            datos_faltantes=d_falt,
                            sin_fuente=s_fuente,
                        )
                    )
    porcion_declarada = (
        porcion
        if (porcion is not None and porcion > 0)
        else (
            unidad_venta_receta
            if (unidad_venta_receta and unidad_venta_receta > 0)
            else getattr(producto, "porcion", None)
        )
    )
    medida_casera_declarada = (
        medida_casera.strip()
        if (medida_casera and medida_casera.strip())
        else (
            medida_casera_receta.strip()
            if (medida_casera_receta and medida_casera_receta.strip())
            else getattr(producto, "medida_casera", None)
        )
    )
    ids_insumos = [insumo.id for insumo, _ in composicion]
    datos_por_insumo: Dict[int, Dict[Nutriente, float]] = {insumo_id: {} for insumo_id in ids_insumos}


    nutrientes_incompletos = {
        nut
        for f in faltantes
        for nut in (*f.datos_faltantes, *f.sin_fuente)
    }

    if ids_insumos:
        registros = db.scalars(
            select(DatoNutricionalInsumo).where(DatoNutricionalInsumo.insumo_id.in_(ids_insumos))
        ).all()
        for reg in registros:
            if reg.valor is not None:
                datos_por_insumo.setdefault(reg.insumo_id, {})[reg.nutriente] = reg.valor


    vds_db = {v.nutriente: v for v in obtener_valores_diarios_referencia(db)}
    filas: List[schemas.FilaNutricionalNormativa] = []
    for cfg in NUTRIENTES_TABLA_NORMATIVA:
        nutriente = cfg["nutriente"]
        vd_item = vds_db.get(nutriente)
        vd = vd_item.valor_diario if vd_item else cfg["valor_diario"]
        if rendimiento_gramos <= 0:
            filas.append(
                schemas.FilaNutricionalNormativa(
                    nutriente=nutriente,
                    nombre=cfg["nombre"],
                    subnivel=cfg["subnivel"],
                    obligatorio=cfg["obligatorio"],
                    completo=False,
                )
            )
            continue
        fila_completa = bool(composicion) and (nutriente.value not in nutrientes_incompletos)
        alguno_tiene = any(nutriente in datos_por_insumo.get(insumo.id, {}) for insumo, _ in composicion) if composicion else False
        valor_100g: Optional[float] = None
        valor_porcion: Optional[float] = None
        porcentaje_vd: Optional[int] = None
        if alguno_tiene:
            aporte_total = sum(
                (cantidad / 100.0) * datos_por_insumo.get(insumo.id, {}).get(nutriente, 0.0)
                for insumo, cantidad in composicion
            )
            crudo_100g = (aporte_total / rendimiento_gramos) * 100.0
            valor_100g = _expresar_segun_configuracion(crudo_100g, vd_item)
            if porcion_declarada and porcion_declarada > 0:
                crudo_porcion = crudo_100g * (porcion_declarada / 100.0)
                valor_porcion = _expresar_segun_configuracion(crudo_porcion, vd_item)
                if vd and vd > 0:
                    porcentaje_vd = 0 if valor_porcion == 0 else round((crudo_porcion / vd) * 100)
        filas.append(
            schemas.FilaNutricionalNormativa(
                nutriente=nutriente,
                nombre=cfg["nombre"],
                subnivel=cfg["subnivel"],
                obligatorio=cfg["obligatorio"],
                valor_100g=valor_100g,
                valor_porcion=valor_porcion,
                porcentaje_vd=porcentaje_vd,
                completo=fila_completa,
            )
        )
    tabla_completa = (
        len(faltantes) == 0
        and rendimiento_gramos > 0
        and porcion_declarada is not None
        and porcion_declarada > 0
        and bool(medida_casera_declarada)
        and all(fila.completo for fila in filas if fila.obligatorio)
    )
    insumos_sin_datos = list(dict.fromkeys([f.insumo_nombre for f in faltantes]))
    return schemas.InformacionNutricionalProducto(
        producto_id=producto.id,
        producto_nombre=producto.nombre,
        unidad_base=unidad_base,
        porcion=porcion_declarada,
        medida_casera=medida_casera_declarada,
        estado=EstadoTablaNutricional.COMPLETA if tabla_completa else EstadoTablaNutricional.INCOMPLETA,
        leyenda=LEYENDA_TABLA_NUTRICIONAL,
        nota_pie=NOTA_PIE_VALORES_DIARIOS,
        insumos_sin_datos=insumos_sin_datos,
        filas=filas,
        faltantes=faltantes,
    )