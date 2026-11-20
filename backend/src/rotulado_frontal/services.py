from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.aditivos.models import Aditivo, ClaseFuncionalAditivo
from src.asociaciones.detalle_receta import detalle_receta
from src.empleados import services as empleados_services
from src.insumos import services as insumos_services
from src.insumos.models import Insumo
from src.parametros_normativos import services as parametros_services
from src.parametros_normativos.constants import LEYENDAS_PRECAUTORIAS, Agregado, SelloAdvertencia
from src.parametros_normativos.models import ConjuntoParametros
from src.productos import services as productos_services
from src.productos.models import Producto
from src.recetas.constants import EstadoVersionReceta
from src.recetas.models import Receta, VersionReceta
from src.rotulado_frontal import exceptions, schemas
from src.rotulado_frontal.constants import ResultadoAplicabilidad
from src.rotulado_frontal.models import EvaluacionAplicabilidad, MarcaInsumo

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
