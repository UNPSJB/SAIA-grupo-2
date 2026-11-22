from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.alergenos import exceptions, schemas
from src.alergenos.constants import (
    NOMBRE_EN_ROTULO,
    NOMBRE_UNIDAD_DURACION,
    Alergeno,
    EstadoDeclaracion,
)
from src.alergenos.models import CondicionesConservacion, DeclaracionAlergenos, MarcaAlergenosInsumo
from src.empleados import services as empleados_services
from src.empleados.models import RolEmpleado
from src.insumos import services as insumos_services
from src.insumos.models import Insumo
from src.productos import services as productos_services
from src.productos.models import Producto
from src.recetas.constants import EstadoVersionReceta
from src.recetas.models import DetalleReceta, Receta, VersionReceta


def _marca_a_esquema(insumo: Insumo, marca: Optional[MarcaAlergenosInsumo]) -> schemas.MarcaInsumo:
    if marca is None:
        return schemas.MarcaInsumo(insumo=schemas.InsumoResumen.model_validate(insumo))
    return schemas.MarcaInsumo(
        insumo=schemas.InsumoResumen.model_validate(insumo),
        alergenos=marca.alergenos,
        contiene_gluten=marca.contiene_gluten,
        revisado=True,
        fecha_cambio=marca.fecha_cambio,
        cambiado_por=marca.cambiado_por,
    )


def listar_marcas(db: Session) -> List[schemas.MarcaInsumo]:
    """Marcas de todos los insumos activos y de los inactivos que ya tengan marcas cargadas."""
    marcas = {marca.insumo_id: marca for marca in db.scalars(select(MarcaAlergenosInsumo)).all()}
    insumos = db.scalars(select(Insumo).order_by(Insumo.nombre)).all()
    return [_marca_a_esquema(insumo, marcas.get(insumo.id)) for insumo in insumos if insumo.activo or insumo.id in marcas]


def actualizar_marcas(db: Session, datos: schemas.ActualizacionMarcas) -> List[schemas.MarcaInsumo]:
    empleados_services.leer_empleado(db, datos.empleado_id)
    ahora = datetime.now()
    for cambio in datos.marcas:
        insumos_services.leer_insumo(db, cambio.insumo_id)
        marca = db.get(MarcaAlergenosInsumo, cambio.insumo_id) or MarcaAlergenosInsumo(insumo_id=cambio.insumo_id)
        marca.alergenos = [alergeno.value for alergeno in cambio.alergenos]
        marca.contiene_gluten = cambio.contiene_gluten
        marca.fecha_cambio = ahora
        marca.cambiado_por_id = datos.empleado_id
        db.add(marca)
    db.commit()
    return listar_marcas(db)


def _version_vigente_receta(db: Session, producto_id: int) -> Optional[VersionReceta]:
    return db.scalar(
        select(VersionReceta)
        .join(Receta, Receta.id == VersionReceta.receta_id)
        .where(Receta.producto_id == producto_id, VersionReceta.estado == EstadoVersionReceta.ACTIVO)
        .order_by(VersionReceta.version.desc())
    )


def proponer(db: Session, producto_id: int) -> schemas.Propuesta:
    """Une las marcas de los insumos de la receta vigente: cada alergeno con los insumos que lo aportan."""
    version = _version_vigente_receta(db, producto_id)
    if version is None:
        return schemas.Propuesta(tiene_receta=False)

    ids_insumos = list(
        dict.fromkeys(
            db.scalars(
                select(DetalleReceta.insumo_id)
                .where(DetalleReceta.receta_id == version.receta_id, DetalleReceta.nro_version == version.version)
                .order_by(DetalleReceta.renglon)
            ).all()
        )
    )
    insumos = {i.id: i for i in db.scalars(select(Insumo).where(Insumo.id.in_(ids_insumos))).all()}
    marcas = {
        m.insumo_id: m
        for m in db.scalars(select(MarcaAlergenosInsumo).where(MarcaAlergenosInsumo.insumo_id.in_(ids_insumos))).all()
    }

    por_alergeno: Dict[Alergeno, List[str]] = {}
    con_gluten: List[str] = []
    for insumo_id in ids_insumos:
        marca = marcas.get(insumo_id)
        if marca is None:
            continue
        nombre = insumos[insumo_id].nombre
        for alergeno in marca.alergenos:
            por_alergeno.setdefault(Alergeno(alergeno), []).append(nombre)
        if marca.contiene_gluten:
            con_gluten.append(nombre)

    return schemas.Propuesta(
        tiene_receta=True,
        version_receta=version.version,
        contiene=[
            schemas.AlergenoPropuesto(alergeno=alergeno, insumos=por_alergeno[alergeno])
            for alergeno in schemas.ordenar_alergenos(list(por_alergeno))
        ],
        contiene_gluten=bool(con_gluten),
        insumos_con_gluten=con_gluten,
        insumos_sin_revisar=[
            schemas.InsumoResumen.model_validate(insumos[insumo_id]) for insumo_id in ids_insumos if insumo_id not in marcas
        ],
    )


def _alergenos_propuestos(propuesta: schemas.Propuesta) -> List[str]:
    return [item.alergeno.value for item in propuesta.contiene]


def _cambio_la_propuesta(declaracion: DeclaracionAlergenos, propuesta: schemas.Propuesta) -> bool:
    return (
        declaracion.version_receta != propuesta.version_receta
        or declaracion.propuesta != _alergenos_propuestos(propuesta)
        or declaracion.propuesta_gluten != propuesta.contiene_gluten
    )


def _enumerar(nombres: List[str]) -> str:
    if len(nombres) == 1:
        return nombres[0]
    return f"{', '.join(nombres[:-1])} Y {nombres[-1]}"


def leyenda_alergenos(prefijo: str, alergenos: List[str]) -> Optional[str]:
    """Frase en mayusculas para ubicar despues de la lista de ingredientes, como pide el articulo 235 septimo."""
    if not alergenos:
        return None
    return f"{prefijo} {_enumerar([NOMBRE_EN_ROTULO[Alergeno(a)] for a in alergenos])}."


def _numero(valor: float) -> str:
    return str(int(valor)) if float(valor).is_integer() else f"{valor:g}".replace(".", ",")


def leyenda_conservacion(condiciones: Optional[CondicionesConservacion]) -> Optional[str]:
    if condiciones is None:
        return None
    frases = []
    minima, maxima = condiciones.temperatura_minima, condiciones.temperatura_maxima
    if minima is not None and maxima is not None:
        frases.append(f"Conservar entre {_numero(minima)} °C y {_numero(maxima)} °C")
    elif maxima is not None:
        frases.append(f"Conservar a no más de {_numero(maxima)} °C")
    elif minima is not None:
        frases.append(f"Conservar a no menos de {_numero(minima)} °C")
    if condiciones.duracion is not None:
        singular, plural = NOMBRE_UNIDAD_DURACION[condiciones.unidad_duracion]
        unidad = singular if condiciones.duracion == 1 else plural
        condicion = " en estas condiciones" if frases else ""
        frases.append(f"Duración{condicion}: {condiciones.duracion} {unidad}")
    if condiciones.instrucciones:
        frases.append(condiciones.instrucciones.rstrip("."))
    return ". ".join(frases) + "." if frases else None


def _declaracion_a_esquema(declaracion: DeclaracionAlergenos) -> schemas.Declaracion:
    return schemas.Declaracion(
        contiene=declaracion.contiene,
        contiene_gluten=declaracion.contiene_gluten,
        puede_contener=declaracion.puede_contener,
        estado=declaracion.estado,
        version_receta=declaracion.version_receta,
        modificada_respecto_de_la_propuesta=(
            declaracion.contiene != declaracion.propuesta or declaracion.contiene_gluten != declaracion.propuesta_gluten
        ),
        fecha_modificacion=declaracion.fecha_modificacion,
        modificado_por=declaracion.modificado_por,
        fecha_confirmacion=declaracion.fecha_confirmacion,
        confirmado_por=declaracion.confirmado_por,
    )


def _conservacion_a_esquema(condiciones: CondicionesConservacion) -> schemas.Conservacion:
    return schemas.Conservacion(
        temperatura_minima=condiciones.temperatura_minima,
        temperatura_maxima=condiciones.temperatura_maxima,
        duracion=condiciones.duracion,
        unidad_duracion=condiciones.unidad_duracion,
        instrucciones=condiciones.instrucciones,
        fecha_modificacion=condiciones.fecha_modificacion,
        modificado_por=condiciones.modificado_por,
    )


def _detalle(db: Session, producto: Producto) -> schemas.DetalleProducto:
    propuesta = proponer(db, producto.id)
    declaracion = db.get(DeclaracionAlergenos, producto.id)
    condiciones = db.get(CondicionesConservacion, producto.id)
    contiene = declaracion.contiene if declaracion else _alergenos_propuestos(propuesta)
    return schemas.DetalleProducto(
        producto=schemas.ProductoResumen.model_validate(producto),
        propuesta=propuesta,
        declaracion=_declaracion_a_esquema(declaracion) if declaracion else None,
        propuesta_cambio=bool(declaracion) and _cambio_la_propuesta(declaracion, propuesta),
        conservacion=_conservacion_a_esquema(condiciones) if condiciones else None,
        leyendas=schemas.Leyendas(
            contiene=leyenda_alergenos("CONTIENE", contiene),
            puede_contener=leyenda_alergenos("PUEDE CONTENER", declaracion.puede_contener if declaracion else []),
            conservacion=leyenda_conservacion(condiciones),
        ),
    )


def detalle_producto(db: Session, producto_id: int) -> schemas.DetalleProducto:
    return _detalle(db, productos_services.leer_producto(db, producto_id))


def guardar_declaracion(db: Session, producto_id: int, datos: schemas.DeclaracionUpdate) -> schemas.DetalleProducto:
    """Guarda la declaracion. Confirmarla queda reservado a quien tiene permiso de administrar.

    Guardar sin confirmar, o modificar una ya confirmada, la deja otra vez como sugerida.
    """
    producto = productos_services.leer_producto(db, producto_id)
    empleado = empleados_services.leer_empleado(db, datos.empleado_id)
    if datos.confirmar and empleado.rol != RolEmpleado.ADMIN:
        raise exceptions.PermisoConfirmacion()

    propuesta = proponer(db, producto_id)
    ahora = datetime.now()
    declaracion = db.get(DeclaracionAlergenos, producto_id) or DeclaracionAlergenos(producto_id=producto_id)
    declaracion.contiene = [a.value for a in datos.contiene]
    declaracion.contiene_gluten = datos.contiene_gluten
    declaracion.puede_contener = [a.value for a in datos.puede_contener]
    declaracion.version_receta = propuesta.version_receta
    declaracion.propuesta = _alergenos_propuestos(propuesta)
    declaracion.propuesta_gluten = propuesta.contiene_gluten
    declaracion.fecha_modificacion = ahora
    declaracion.modificado_por_id = empleado.id
    if datos.confirmar:
        declaracion.estado = EstadoDeclaracion.CONFIRMADA
        declaracion.fecha_confirmacion = ahora
        declaracion.confirmado_por_id = empleado.id
    else:
        declaracion.estado = EstadoDeclaracion.SUGERIDA
        declaracion.fecha_confirmacion = None
        declaracion.confirmado_por_id = None
    db.add(declaracion)
    db.commit()
    db.refresh(declaracion)
    return _detalle(db, producto)


def guardar_conservacion(db: Session, producto_id: int, datos: schemas.ConservacionUpdate) -> schemas.DetalleProducto:
    producto = productos_services.leer_producto(db, producto_id)
    empleados_services.leer_empleado(db, datos.empleado_id)
    instrucciones = datos.instrucciones or None
    if datos.temperatura_minima is None and datos.temperatura_maxima is None and datos.duracion is None and not instrucciones:
        raise exceptions.SinDatosConservacion()
    if (
        datos.temperatura_minima is not None
        and datos.temperatura_maxima is not None
        and datos.temperatura_minima > datos.temperatura_maxima
    ):
        raise exceptions.TemperaturasInvertidas()

    condiciones = db.get(CondicionesConservacion, producto_id) or CondicionesConservacion(producto_id=producto_id)
    condiciones.temperatura_minima = datos.temperatura_minima
    condiciones.temperatura_maxima = datos.temperatura_maxima
    condiciones.duracion = datos.duracion
    condiciones.unidad_duracion = datos.unidad_duracion
    condiciones.instrucciones = instrucciones
    condiciones.fecha_modificacion = datetime.now()
    condiciones.modificado_por_id = datos.empleado_id
    db.add(condiciones)
    db.commit()
    db.refresh(condiciones)
    return _detalle(db, producto)


def resumen(db: Session) -> List[schemas.ResumenProducto]:
    """Estado de todos los productos: lo declarado si hay declaracion guardada, si no lo que sugiere el sistema."""
    declaraciones = {d.producto_id: d for d in db.scalars(select(DeclaracionAlergenos)).all()}
    conservaciones = {c.producto_id: c for c in db.scalars(select(CondicionesConservacion)).all()}
    resultado = []
    for producto in db.scalars(select(Producto).order_by(Producto.nombre)).all():
        propuesta = proponer(db, producto.id)
        declaracion = declaraciones.get(producto.id)
        resultado.append(
            schemas.ResumenProducto(
                producto=schemas.ProductoResumen.model_validate(producto),
                tiene_receta=propuesta.tiene_receta,
                estado=declaracion.estado if declaracion else EstadoDeclaracion.SUGERIDA,
                guardada=declaracion is not None,
                propuesta_cambio=bool(declaracion) and _cambio_la_propuesta(declaracion, propuesta),
                contiene=declaracion.contiene if declaracion else _alergenos_propuestos(propuesta),
                contiene_gluten=declaracion.contiene_gluten if declaracion else propuesta.contiene_gluten,
                puede_contener=declaracion.puede_contener if declaracion else [],
                leyenda_conservacion=leyenda_conservacion(conservaciones.get(producto.id)),
            )
        )
    return resultado
