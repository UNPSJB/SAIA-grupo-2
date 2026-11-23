from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.aditivos.models import Aditivo, ClaseFuncionalAditivo
from src.asociaciones.detalle_receta import detalle_receta
from src.datos_nutricionales.constants import EstadoTablaNutricional, Nutriente
from src.empleados import services as empleados_services
from src.insumos import services as insumos_services
from src.insumos.models import Insumo
from src.parametros_normativos import services as parametros_services
from src.parametros_normativos.constants import (
    LEYENDAS_PRECAUTORIAS,
    Agregado,
    ClaveParametro,
    CondicionCriterio,
    FormaCriterio,
    SelloAdvertencia,
)
from src.parametros_normativos.models import ConjuntoParametros
from src.productos import services as productos_services
from src.productos.models import Producto
from src.recetas import services as recetas_services
from src.recetas.constants import EstadoVersionReceta
from src.recetas.models import Receta, VersionReceta
from src.rotulado_frontal import exceptions, schemas
from src.rotulado_frontal.constants import ResultadoAplicabilidad
from src.rotulado_frontal.models import CalculoSellosRotulado, EvaluacionAplicabilidad, MarcaInsumo

CAMPO_POR_AGREGADO = {
    Agregado.AZUCARES: "agrega_azucares",
    Agregado.GRASAS: "agrega_grasas",
    Agregado.SODIO: "agrega_sodio",
    Agregado.EDULCORANTES: "contiene_edulcorantes",
    Agregado.CAFEINA: "contiene_cafeina",
}


def determinar_aplicabilidad(
    datos: schemas.DatosAplicabilidad, parametros: ConjuntoParametros
) -> Tuple[ResultadoAplicabilidad, List[SelloAdvertencia]]:
    """Aplica las reglas de la version de parametros y devuelve el resultado y los sellos o leyendas en juego.

    Sin envase en ausencia del cliente no corresponde; una categoria exceptuada tampoco. Si corresponde,
    solo entran los sellos que las reglas asocian a los agregados marcados.
    """
    if not datos.envasado_en_ausencia_del_cliente:
        return ResultadoAplicabilidad.NO_ENVASADO, []
    if datos.excepcion:
        return ResultadoAplicabilidad.EXCEPTUADO, []

    marcados = {agregado for agregado, campo in CAMPO_POR_AGREGADO.items() if getattr(datos, campo)}
    if not marcados:
        return ResultadoAplicabilidad.SIN_AGREGADOS, []

    en_juego = {regla.sello for regla in parametros.sellos_por_agregado if regla.agregado in marcados}
    orden = {texto.sello: texto.orden for texto in parametros.textos}
    return ResultadoAplicabilidad.CORRESPONDE, sorted(en_juego, key=lambda sello: orden.get(sello, len(orden)))


def _a_esquema(evaluacion: EvaluacionAplicabilidad) -> schemas.Evaluacion:
    textos: Dict[SelloAdvertencia, str] = {t.sello: t.texto for t in evaluacion.parametros.textos}
    sellos = [
        schemas.SelloAplicable(
            sello=SelloAdvertencia(sello),
            texto=textos.get(SelloAdvertencia(sello), sello),
            es_leyenda=SelloAdvertencia(sello) in LEYENDAS_PRECAUTORIAS,
        )
        for sello in evaluacion.sellos
    ]
    return schemas.Evaluacion(
        id=evaluacion.id,
        producto=schemas.ProductoResumen.model_validate(evaluacion.producto),
        envasado_en_ausencia_del_cliente=evaluacion.envasado_en_ausencia_del_cliente,
        excepcion=evaluacion.excepcion,
        agrega_azucares=evaluacion.agrega_azucares,
        agrega_grasas=evaluacion.agrega_grasas,
        agrega_sodio=evaluacion.agrega_sodio,
        contiene_edulcorantes=evaluacion.contiene_edulcorantes,
        contiene_cafeina=evaluacion.contiene_cafeina,
        version_receta=evaluacion.version_receta,
        marcas_corregidas=evaluacion.marcas_corregidas,
        resultado=evaluacion.resultado,
        sellos_a_evaluar=[s for s in sellos if not s.es_leyenda],
        leyendas=[s for s in sellos if s.es_leyenda],
        parametros=schemas.ParametrosUsados.model_validate(evaluacion.parametros),
        fecha=evaluacion.fecha,
        evaluado_por=evaluacion.evaluado_por,
    )


def _version_vigente_receta(db: Session, producto_id: int) -> Optional[VersionReceta]:
    """Ultima version activa de la receta del producto, el mismo criterio que usa la tabla nutricional."""
    receta = db.scalar(select(Receta).where(Receta.producto_id == producto_id))
    if receta is None:
        return None
    return db.scalar(
        select(VersionReceta)
        .where(VersionReceta.receta_id == receta.id, VersionReceta.estado == EstadoVersionReceta.ACTIVO)
        .order_by(VersionReceta.version.desc())
    )


def _propuesta(db: Session, producto_id: int, parametros: ConjuntoParametros) -> schemas.PropuestaMarcas:
    version = _version_vigente_receta(db, producto_id)
    if version is None:
        return schemas.PropuestaMarcas(tiene_receta=False)

    renglones = db.execute(
        select(detalle_receta.c.insumo_id, detalle_receta.c.aditivo_id)
        .where(detalle_receta.c.receta_id == version.receta_id, detalle_receta.c.nro_version == version.version)
        .order_by(detalle_receta.c.renglon)
    ).all()
    ids_insumos = list(dict.fromkeys(renglon.insumo_id for renglon in renglones))
    ids_aditivos = {renglon.aditivo_id for renglon in renglones if renglon.aditivo_id is not None}
    insumos = {i.id: i for i in db.scalars(select(Insumo).where(Insumo.id.in_(ids_insumos))).all()}
    marcas = {m.insumo_id: m for m in db.scalars(select(MarcaInsumo).where(MarcaInsumo.insumo_id.in_(ids_insumos))).all()}
    aditivos = {
        fila.id: (fila.nombre_completo, fila.nombre.lower())
        for fila in db.execute(
            select(Aditivo.id, Aditivo.nombre_completo, ClaseFuncionalAditivo.nombre)
            .join(ClaseFuncionalAditivo, ClaseFuncionalAditivo.id == Aditivo.clase_funcional_id)
            .where(Aditivo.id.in_(ids_aditivos))
        ).all()
    }
    agregados_por_clase: Dict[str, Set[Agregado]] = {}
    for regla in parametros.clases_aditivo:
        agregados_por_clase.setdefault(regla.clase_funcional.lower(), set()).add(regla.agregado)

    origenes: List[schemas.OrigenMarca] = []
    for renglon in renglones:
        nombre_insumo = insumos[renglon.insumo_id].nombre
        marca = marcas.get(renglon.insumo_id)
        if marca is not None:
            origenes += [
                schemas.OrigenMarca(agregado=agregado, insumo=nombre_insumo)
                for agregado, campo in CAMPO_POR_AGREGADO.items()
                if getattr(marca, campo)
            ]
        if renglon.aditivo_id in aditivos:
            nombre_aditivo, clase = aditivos[renglon.aditivo_id]
            origenes += [
                schemas.OrigenMarca(agregado=agregado, insumo=nombre_insumo, aditivo=nombre_aditivo, clase_funcional=clase)
                for agregado in sorted(agregados_por_clase.get(clase, set()), key=list(CAMPO_POR_AGREGADO).index)
            ]

    unicos = list({(o.agregado, o.insumo, o.aditivo): o for o in origenes}.values())
    marcados = {origen.agregado for origen in unicos}
    return schemas.PropuestaMarcas(
        tiene_receta=True,
        version_receta=version.version,
        origenes=unicos,
        insumos_sin_revisar=[
            schemas.InsumoResumen.model_validate(insumos[insumo_id]) for insumo_id in ids_insumos if insumo_id not in marcas
        ],
        **{campo: agregado in marcados for agregado, campo in CAMPO_POR_AGREGADO.items()},
    )


def proponer_marcas(db: Session, producto_id: int) -> schemas.PropuestaMarcas:
    """Marcas de agregados que surgen de la receta vigente: marcas de sus insumos y clases de sus aditivos."""
    parametros_services.verificar_modulo_activo(db)
    productos_services.leer_producto(db, producto_id)
    return _propuesta(db, producto_id, parametros_services.conjunto_vigente(db))


def _marcas_de(datos: schemas.MarcasAgregados) -> Tuple[bool, ...]:
    return tuple(getattr(datos, campo) for campo in CAMPO_POR_AGREGADO.values())


def evaluar(db: Session, producto_id: int, datos: schemas.NuevaEvaluacion) -> schemas.Evaluacion:
    parametros_services.verificar_modulo_activo(db)
    productos_services.leer_producto(db, producto_id)
    empleados_services.leer_empleado(db, datos.empleado_id)
    parametros = parametros_services.conjunto_vigente(db)

    excepcion = (datos.excepcion or "").strip() or None
    if excepcion and excepcion not in {e.descripcion for e in parametros.excepciones}:
        raise exceptions.ExcepcionInvalida()
    if not datos.envasado_en_ausencia_del_cliente:
        excepcion = None
    respuestas = datos.model_copy(update={"excepcion": excepcion})

    resultado, sellos = determinar_aplicabilidad(respuestas, parametros)
    propuesta = _propuesta(db, producto_id, parametros)
    evaluacion = EvaluacionAplicabilidad(
        producto_id=producto_id,
        parametros_id=parametros.id,
        version_receta=propuesta.version_receta,
        marcas_corregidas=propuesta.tiene_receta and _marcas_de(propuesta) != _marcas_de(respuestas),
        resultado=resultado,
        sellos=[sello.value for sello in sellos],
        fecha=datetime.now(),
        evaluado_por_id=datos.empleado_id,
        **respuestas.model_dump(exclude={"empleado_id"}),
    )
    db.add(evaluacion)
    db.commit()
    db.refresh(evaluacion)
    return _a_esquema(evaluacion)


def _evaluaciones(db: Session, producto_id: int) -> List[EvaluacionAplicabilidad]:
    return db.scalars(
        select(EvaluacionAplicabilidad)
        .where(EvaluacionAplicabilidad.producto_id == producto_id)
        .order_by(EvaluacionAplicabilidad.fecha.desc(), EvaluacionAplicabilidad.id.desc())
    ).all()


def historial(db: Session, producto_id: int) -> List[schemas.Evaluacion]:
    parametros_services.verificar_modulo_activo(db)
    productos_services.leer_producto(db, producto_id)
    return [_a_esquema(evaluacion) for evaluacion in _evaluaciones(db, producto_id)]


def estado_producto(db: Session, producto_id: int) -> schemas.EstadoProducto:
    parametros_services.verificar_modulo_activo(db)
    producto = productos_services.leer_producto(db, producto_id)
    evaluaciones = _evaluaciones(db, producto_id)
    return schemas.EstadoProducto(
        producto=schemas.ProductoResumen.model_validate(producto),
        evaluacion=_a_esquema(evaluaciones[0]) if evaluaciones else None,
    )


def resumen(db: Session) -> List[schemas.EstadoProducto]:
    """Ultima evaluacion de cada producto, incluidos los que todavia no se evaluaron."""
    parametros_services.verificar_modulo_activo(db)
    ultimas: Dict[int, EvaluacionAplicabilidad] = {}
    for evaluacion in db.scalars(
        select(EvaluacionAplicabilidad).order_by(EvaluacionAplicabilidad.fecha, EvaluacionAplicabilidad.id)
    ).all():
        ultimas[evaluacion.producto_id] = evaluacion
    productos = db.scalars(select(Producto).order_by(Producto.nombre)).all()
    return [
        schemas.EstadoProducto(
            producto=schemas.ProductoResumen.model_validate(producto),
            evaluacion=_a_esquema(ultimas[producto.id]) if producto.id in ultimas else None,
        )
        for producto in productos
    ]


def _marca_a_esquema(insumo: Insumo, marca: Optional[MarcaInsumo]) -> schemas.MarcaInsumo:
    if marca is None:
        return schemas.MarcaInsumo(insumo=schemas.InsumoResumen.model_validate(insumo))
    return schemas.MarcaInsumo(
        insumo=schemas.InsumoResumen.model_validate(insumo),
        revisado=True,
        fecha_cambio=marca.fecha_cambio,
        cambiado_por=marca.cambiado_por,
        **{campo: getattr(marca, campo) for campo in CAMPO_POR_AGREGADO.values()},
    )


def listar_marcas_insumos(db: Session) -> List[schemas.MarcaInsumo]:
    """Marcas de todos los insumos activos y de los inactivos que ya tengan marcas cargadas."""
    parametros_services.verificar_modulo_activo(db)
    marcas = {marca.insumo_id: marca for marca in db.scalars(select(MarcaInsumo)).all()}
    insumos = db.scalars(select(Insumo).order_by(Insumo.nombre)).all()
    return [_marca_a_esquema(insumo, marcas.get(insumo.id)) for insumo in insumos if insumo.activo or insumo.id in marcas]


def actualizar_marcas_insumos(db: Session, datos: schemas.ActualizacionMarcasInsumos) -> List[schemas.MarcaInsumo]:
    parametros_services.verificar_modulo_activo(db)
    empleados_services.leer_empleado(db, datos.empleado_id)
    ahora = datetime.now()
    for cambio in datos.marcas:
        insumos_services.leer_insumo(db, cambio.insumo_id)
        marca = db.get(MarcaInsumo, cambio.insumo_id) or MarcaInsumo(insumo_id=cambio.insumo_id)
        for campo in CAMPO_POR_AGREGADO.values():
            setattr(marca, campo, getattr(cambio, campo))
        marca.fecha_cambio = ahora
        marca.cambiado_por_id = datos.empleado_id
        db.add(marca)
    db.commit()
    return listar_marcas_insumos(db)


SELLOS_QUE_HABILITAN_CALORIAS = (
    SelloAdvertencia.EXCESO_AZUCARES,
    SelloAdvertencia.EXCESO_GRASAS_TOTALES,
    SelloAdvertencia.EXCESO_GRASAS_SATURADAS,
)


def _kcal_sin_aporte_energetico(parametros: ConjuntoParametros) -> Optional[float]:
    return next(
        (p.valor for p in parametros.parametros_generales if p.clave == ClaveParametro.KCAL_BEBIDA_SIN_APORTE_ENERGETICO),
        None,
    )


def _evaluar_condicion_criterio(
    criterio,
    sellos_en_juego: Set[SelloAdvertencia],
    sellos_disparados: Set[SelloAdvertencia],
    kcal_porcion: float,
    limite_sin_aporte: Optional[float],
) -> Tuple[bool, Optional[str]]:
    """Decide si el criterio se evalua segun los agregados y la condicion que fija la version de parametros.

    El exceso en calorias solo se evalua si el producto ya lleva sello de azucares, grasas totales o
    grasas saturadas; el criterio de bebidas sin aporte energetico usa el parametro general por porcion.
    """
    if criterio.sello not in sellos_en_juego:
        return False, "El producto no contiene agregados vinculados a este sello."

    if criterio.condicion == CondicionCriterio.CON_SELLO_DE_ENERGIA:
        if not sellos_disparados.intersection(SELLOS_QUE_HABILITAN_CALORIAS):
            return False, "El exceso en calorías solo se evalúa si el producto lleva sello de azúcares, grasas totales o grasas saturadas."
        return True, None

    if criterio.condicion == CondicionCriterio.SIN_APORTE_ENERGETICO:
        if limite_sin_aporte is None:
            return False, "La versión de parámetros no define el límite de bebida sin aporte energético."
        if kcal_porcion > limite_sin_aporte:
            return False, f"Solo aplica a bebidas sin aporte energético (hasta {limite_sin_aporte:g} kcal por porción)."
        return True, None

    return True, None


def _motivo_sin_agregados(resultado: ResultadoAplicabilidad) -> Optional[str]:
    if resultado == ResultadoAplicabilidad.SIN_AGREGADOS:
        return "El producto no agrega azúcares, grasas, sodio, edulcorantes ni cafeína: no corresponden sellos."
    return None


def calcular_sellos_producto(
    db: Session, producto_id: int, empleado_id: int
) -> schemas.ResultadoCalculoSellos:
    """Ejecuta el calculo dinamico de octogonos de advertencia y leyendas precautorias.

    Lee dinamicamente el conjunto de parametros normativos vigente (`ConjuntoParametros.criterios`),
    la version de receta vigente del producto, la tabla nutricional calculada y la evaluacion de aplicabilidad E12-01.
    """
    parametros_services.verificar_modulo_activo(db)
    producto = productos_services.leer_producto(db, producto_id)
    empleados_services.leer_empleado(db, empleado_id)

    parametros = parametros_services.conjunto_vigente(db)
    textos_dict = {t.sello: t.texto for t in parametros.textos}

    evaluaciones = _evaluaciones(db, producto_id)
    evaluacion = evaluaciones[0] if evaluaciones else None

    if evaluacion is None or evaluacion.resultado in (ResultadoAplicabilidad.NO_ENVASADO, ResultadoAplicabilidad.EXCEPTUADO):
        motivo = "El producto no cuenta con evaluacion de aplicabilidad." if evaluacion is None else (
            "El producto no se envasa en ausencia del cliente." if evaluacion.resultado == ResultadoAplicabilidad.NO_ENVASADO
            else f"Producto exceptuado de rotulado frontal ({evaluacion.excepcion or 'Categoria exceptuada'})."
        )
        res_aplicabilidad = evaluacion.resultado if evaluacion else ResultadoAplicabilidad.NO_ENVASADO
        return schemas.ResultadoCalculoSellos(
            producto=schemas.ProductoResumen.model_validate(producto),
            provisorio=False,
            resultado_aplicabilidad=res_aplicabilidad,
            motivo_aplicabilidad=motivo,
            sellos_obtenidos=[],
            leyendas_obtenidas=[],
            pasos_calculo=[],
            parametros=schemas.ParametrosUsados.model_validate(parametros),
            fecha_calculo=datetime.now(),
            calculado_por=empleados_services.leer_empleado(db, empleado_id),
        )

    version_receta = _version_vigente_receta(db, producto_id)
    if version_receta is None:
        return schemas.ResultadoCalculoSellos(
            producto=schemas.ProductoResumen.model_validate(producto),
            provisorio=True,
            resultado_aplicabilidad=evaluacion.resultado,
            motivo_aplicabilidad="El producto no cuenta con una version vigente de receta.",
            sellos_obtenidos=[],
            leyendas_obtenidas=[],
            pasos_calculo=[],
            parametros=schemas.ParametrosUsados.model_validate(parametros),
            fecha_calculo=datetime.now(),
            calculado_por=empleados_services.leer_empleado(db, empleado_id),
        )

    tabla_nut = recetas_services.calcular_informacion_nutricional_receta(db, version_receta.receta_id, version_receta.version)
    provisorio = getattr(tabla_nut, "estado", None) == EstadoTablaNutricional.INCOMPLETA or bool(getattr(tabla_nut, "faltantes", []))

    items_dict = {item.nutriente: item for item in tabla_nut.items}
    energia_item = items_dict.get(Nutriente.ENERGIA.value)
    kcal_100g = energia_item.valor_100g_raw if energia_item and energia_item.valor_100g_raw is not None else 0.0
    kcal_porcion = energia_item.valor_porcion_raw if energia_item and energia_item.valor_porcion_raw is not None else 0.0
    limite_sin_aporte = _kcal_sin_aporte_energetico(parametros)

    resultado_ap, sellos_en_juego = determinar_aplicabilidad(evaluacion, parametros)
    sellos_en_juego_set = set(sellos_en_juego)
    orden_textos = {t.sello: t.orden for t in parametros.textos}

    criterios = sorted(
        (c for c in parametros.criterios if c.tipo_producto == producto.tipo),
        key=lambda c: (c.condicion == CondicionCriterio.CON_SELLO_DE_ENERGIA, c.orden),
    )
    pasos_calculo: List[schemas.PasoCalculoNutriente] = []
    sellos_disparados: Set[SelloAdvertencia] = set()

    for criterio in criterios:
        evaluado, motivo_no_eval = _evaluar_condicion_criterio(
            criterio, sellos_en_juego_set, sellos_disparados, kcal_porcion, limite_sin_aporte
        )
        if not evaluado:
            pasos_calculo.append(
                schemas.PasoCalculoNutriente(
                    sello=criterio.sello,
                    nutriente=criterio.nutriente,
                    evaluado=False,
                    motivo_no_evaluado=motivo_no_eval,
                    forma_evaluacion=criterio.forma,
                    limite_umbral=criterio.limite,
                    unidad_umbral=criterio.unidad,
                    supera_umbral=False,
                    formula_desplegada=f"Omitido: {motivo_no_eval}",
                )
            )
            continue

        nut_item = items_dict.get(criterio.nutriente.value)
        valor_100g = nut_item.valor_100g_raw if nut_item and nut_item.valor_100g_raw is not None else 0.0

        if criterio.forma == FormaCriterio.PORCENTAJE_ENERGIA:
            factor = criterio.factor_energetico or (9.0 if criterio.nutriente in (Nutriente.GRASAS_TOTALES, Nutriente.GRASAS_SATURADAS) else 4.0)
            aporte_kcal = valor_100g * factor
            valor_calc = (aporte_kcal * 100.0 / kcal_100g) if kcal_100g > 0 else 0.0
            supera = valor_calc >= criterio.limite
            formula_text = (
                f"( {valor_100g:.2f} g × {factor:.1f} kcal/g × 100 ) / {kcal_100g:.2f} kcal = {valor_calc:.2f} % "
                f"(Umbral: ≥ {criterio.limite:.1f} %)"
            )
            paso = schemas.PasoCalculoNutriente(
                sello=criterio.sello,
                nutriente=criterio.nutriente,
                evaluado=True,
                forma_evaluacion=criterio.forma,
                valor_gramos_100g=round(valor_100g, 4),
                factor_energetico_utilizado=factor,
                aporte_kcal_nutriente=round(aporte_kcal, 4),
                energia_total_kcal_100g=round(kcal_100g, 4),
                valor_calculado=round(valor_calc, 2),
                limite_umbral=criterio.limite,
                unidad_umbral=criterio.unidad,
                supera_umbral=supera,
                formula_desplegada=formula_text,
            )
        elif criterio.forma == FormaCriterio.MG_POR_KCAL:
            valor_calc = (valor_100g / kcal_100g) if kcal_100g > 0 else 0.0
            supera = valor_calc >= criterio.limite
            formula_text = (
                f"{valor_100g:.2f} mg / {kcal_100g:.2f} kcal = {valor_calc:.2f} mg/kcal "
                f"(Umbral: ≥ {criterio.limite:.1f} mg/kcal)"
            )
            paso = schemas.PasoCalculoNutriente(
                sello=criterio.sello,
                nutriente=criterio.nutriente,
                evaluado=True,
                forma_evaluacion=criterio.forma,
                valor_gramos_100g=round(valor_100g, 4),
                energia_total_kcal_100g=round(kcal_100g, 4),
                valor_calculado=round(valor_calc, 2),
                limite_umbral=criterio.limite,
                unidad_umbral=criterio.unidad,
                supera_umbral=supera,
                formula_desplegada=formula_text,
            )
        else:
            valor_calc = kcal_100g if criterio.nutriente == Nutriente.ENERGIA else valor_100g
            supera = valor_calc >= criterio.limite
            formula_text = (
                f"{valor_calc:.2f} {criterio.unidad} "
                f"(Umbral: ≥ {criterio.limite:.1f} {criterio.unidad})"
            )
            paso = schemas.PasoCalculoNutriente(
                sello=criterio.sello,
                nutriente=criterio.nutriente,
                evaluado=True,
                forma_evaluacion=criterio.forma,
                valor_gramos_100g=round(valor_100g, 4),
                energia_total_kcal_100g=round(kcal_100g, 4),
                valor_calculado=round(valor_calc, 2),
                limite_umbral=criterio.limite,
                unidad_umbral=criterio.unidad,
                supera_umbral=supera,
                formula_desplegada=formula_text,
            )

        pasos_calculo.append(paso)
        if supera:
            sellos_disparados.add(criterio.sello)

    leyendas_disparadas = [s for s in sellos_en_juego if s in LEYENDAS_PRECAUTORIAS]

    sellos_obtenidos_dto = [
        schemas.SelloAplicable(
            sello=s,
            texto=textos_dict.get(s, s.value),
            es_leyenda=False,
        )
        for s in sorted(sellos_disparados, key=lambda sello: orden_textos.get(sello, len(orden_textos)))
        if s not in LEYENDAS_PRECAUTORIAS
    ]

    leyendas_obtenidas_dto = [
        schemas.SelloAplicable(
            sello=l,
            texto=textos_dict.get(l, l.value),
            es_leyenda=True,
        )
        for l in leyendas_disparadas
    ]

    calculo_obj = CalculoSellosRotulado(
        producto_id=producto_id,
        evaluacion_aplicabilidad_id=evaluacion.id,
        version_receta=version_receta.version,
        parametros_id=parametros.id,
        fecha_calculo=datetime.now(),
        calculado_por_id=empleado_id,
        provisorio=provisorio,
        sellos_obtenidos=[s.sello.value for s in sellos_obtenidos_dto + leyendas_obtenidas_dto],
        detalle_calculo=[p.model_dump(mode="json") for p in pasos_calculo],
    )
    db.add(calculo_obj)
    db.commit()
    db.refresh(calculo_obj)

    return schemas.ResultadoCalculoSellos(
        id=calculo_obj.id,
        producto=schemas.ProductoResumen.model_validate(producto),
        version_receta=version_receta.version,
        provisorio=provisorio,
        resultado_aplicabilidad=evaluacion.resultado,
        motivo_aplicabilidad=_motivo_sin_agregados(evaluacion.resultado),
        sellos_obtenidos=sellos_obtenidos_dto,
        leyendas_obtenidas=leyendas_obtenidas_dto,
        pasos_calculo=pasos_calculo,
        parametros=schemas.ParametrosUsados.model_validate(parametros),
        fecha_calculo=calculo_obj.fecha_calculo,
        calculado_por=empleados_services.leer_empleado(db, empleado_id),
    )


def obtener_calculo_sellos_vigente(
    db: Session, producto_id: int
) -> Optional[schemas.ResultadoCalculoSellos]:
    """Retorna el ultimo calculo de sellos guardado para el producto, o None si aun no fue calculado."""
    parametros_services.verificar_modulo_activo(db)
    productos_services.leer_producto(db, producto_id)
    calculo = db.scalar(
        select(CalculoSellosRotulado)
        .where(CalculoSellosRotulado.producto_id == producto_id)
        .order_by(CalculoSellosRotulado.fecha_calculo.desc(), CalculoSellosRotulado.id.desc())
    )
    if calculo is None:
        return None

    parametros = calculo.parametros
    textos_dict = {t.sello: t.texto for t in parametros.textos}
    sellos_objs = [SelloAdvertencia(s) for s in calculo.sellos_obtenidos]

    sellos_dto = [
        schemas.SelloAplicable(sello=s, texto=textos_dict.get(s, s.value), es_leyenda=False)
        for s in sellos_objs if s not in LEYENDAS_PRECAUTORIAS
    ]
    leyendas_dto = [
        schemas.SelloAplicable(sello=s, texto=textos_dict.get(s, s.value), es_leyenda=True)
        for s in sellos_objs if s in LEYENDAS_PRECAUTORIAS
    ]
    pasos = [schemas.PasoCalculoNutriente(**p) for p in calculo.detalle_calculo]

    evaluacion_id = calculo.evaluacion_aplicabilidad_id
    evaluacion_obj = db.get(EvaluacionAplicabilidad, evaluacion_id) if evaluacion_id else None
    resultado_ap = evaluacion_obj.resultado if evaluacion_obj else ResultadoAplicabilidad.NO_ENVASADO

    return schemas.ResultadoCalculoSellos(
        id=calculo.id,
        producto=schemas.ProductoResumen.model_validate(calculo.producto),
        version_receta=calculo.version_receta,
        provisorio=calculo.provisorio,
        resultado_aplicabilidad=resultado_ap,
        motivo_aplicabilidad=_motivo_sin_agregados(resultado_ap),
        sellos_obtenidos=sellos_dto,
        leyendas_obtenidas=leyendas_dto,
        pasos_calculo=pasos,
        parametros=schemas.ParametrosUsados.model_validate(parametros),
        fecha_calculo=calculo.fecha_calculo,
        calculado_por=empleados_services.leer_empleado(db, calculo.calculado_por_id),
    )
