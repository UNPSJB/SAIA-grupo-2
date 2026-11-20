from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func
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
from src.datos_nutricionales.models import DatoNutricionalInsumo
from src.empleados import services as empleados_services
from src.empleados.models import Empleado
from src.insumos import services as insumos_services
from src.insumos.models import Insumo

from src.asociaciones.lote_insumos import lote_insumo
from src.lotes_produccion.models import LoteProduccion
from src.productos import services as productos_services
from src.productos.constants import TipoProducto


from src.asociaciones.detalle_receta import detalle_receta
from src.recetas.constants import EstadoVersionReceta
from src.recetas.models import Receta, VersionReceta


ORDEN_NUTRIENTES = {nutriente: posicion for posicion, nutriente in enumerate(Nutriente)}


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
    """Identifica de donde sale el dato: misma fuente y misma referencia es la misma carga."""
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
    """Carga, corrige o borra datos nutricionales del insumo dejando registro de fuente, fecha y autor.

    Si cambia la fuente o la referencia, es una carga nueva: el valor informado pasa a ser el de
    la fuente. Si se mantiene la fuente y cambia el valor, es una modificacion manual.
    """
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
    return obtener_datos_insumo(db, insumo_id)


def resumen_por_insumo(db: Session) -> List[schemas.ResumenNutricionalInsumo]:
    """Estado de la carga nutricional de cada insumo activo, para ver de un vistazo que falta."""
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





def _composicion_producto(
    db: Session, producto_id: int
) -> Tuple[List[Tuple[Insumo, float]], float, Optional[float]]:
    # 1. Buscamos si el producto tiene receta
    receta = db.scalar(select(Receta).where(Receta.producto_id == producto_id))
    if receta is not None:
        version_activa = db.scalar(
            select(VersionReceta)
            .where(
                VersionReceta.receta_id == receta.id,
                VersionReceta.estado == EstadoVersionReceta.ACTIVO,
            )
            .order_by(VersionReceta.version.desc())
        )
        if version_activa is None:
            return [], 0.0, None

        filas_receta = db.execute(
            select(Insumo, func.sum(detalle_receta.c.cantidad_gramos))
            .join(detalle_receta, Insumo.id == detalle_receta.c.insumo_id)
            .where(
                detalle_receta.c.receta_id == receta.id,
                detalle_receta.c.nro_version == version_activa.version,
            )
            .group_by(Insumo.id)
            .order_by(Insumo.nombre)
        ).all()
        items = [(ins, float(cant)) for ins, cant in filas_receta if cant and cant > 0]
        rendimiento = float(version_activa.rendimiento_final_gramos or 0.0)
        if not items or rendimiento <= 0:
            return [], 0.0, None

        # Acá se extrae la porción por defecto (unidad_venta_gramos)
        unidad_venta = (
            float(version_activa.unidad_venta_gramos)
            if version_activa.unidad_venta_gramos and version_activa.unidad_venta_gramos > 0
            else None
        )
        return items, rendimiento, unidad_venta

    # 2. Si no tiene receta, hace el fallback histórico a lotes
    consulta = (
        select(Insumo, func.sum(lote_insumo.c.cantidad_utilizada))
        .join(lote_insumo, Insumo.id == lote_insumo.c.insumo_id)
        .join(LoteProduccion, LoteProduccion.nro_lote == lote_insumo.c.lote_id)
        .where(LoteProduccion.producto_id == producto_id)
        .group_by(Insumo.id)
        .order_by(Insumo.nombre)
    )
    items_lote = [(insumo, float(cantidad)) for insumo, cantidad in db.execute(consulta).all() if cantidad and cantidad > 0]
    peso_total = sum(cantidad for _, cantidad in items_lote)
    return items_lote, peso_total, None

    

def obtener_informacion_nutricional_producto(
    db: Session,
    producto_id: int,
    porcion: Optional[float] = None,
    medida_casera: Optional[str] = None,
) -> schemas.InformacionNutricionalProducto:
    producto = productos_services.leer_producto(db, producto_id)
    unidad_base = "ml" if producto.tipo == TipoProducto.BEBIDA else "g"
    composicion, rendimiento_gramos, unidad_venta_receta = _composicion_producto(db, producto_id)

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
        else getattr(producto, "medida_casera", None)
    )

    ids_insumos = [insumo.id for insumo, _ in composicion]
    datos_por_insumo: Dict[int, Dict[Nutriente, float]] = {insumo_id: {} for insumo_id in ids_insumos}
    if ids_insumos:
        registros = db.scalars(
            select(DatoNutricionalInsumo).where(DatoNutricionalInsumo.insumo_id.in_(ids_insumos))
        ).all()
        for reg in registros:
            datos_por_insumo.setdefault(reg.insumo_id, {})[reg.nutriente] = reg.valor

    nutrientes_obligatorios = [cfg["nutriente"] for cfg in NUTRIENTES_TABLA_NORMATIVA if cfg["obligatorio"]]
    insumos_sin_datos = [
        insumo.nombre
        for insumo, _ in composicion
        if any(nut not in datos_por_insumo.get(insumo.id, {}) for nut in nutrientes_obligatorios)
    ]

    filas: List[schemas.FilaNutricionalNormativa] = []
    for cfg in NUTRIENTES_TABLA_NORMATIVA:
        nutriente = cfg["nutriente"]
        vd = cfg["valor_diario"]

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

        todos_tienen = all(nutriente in datos_por_insumo.get(insumo.id, {}) for insumo, _ in composicion)
        alguno_tiene = any(nutriente in datos_por_insumo.get(insumo.id, {}) for insumo, _ in composicion)

        valor_100g: Optional[float] = None
        valor_porcion: Optional[float] = None
        porcentaje_vd: Optional[int] = None

        if alguno_tiene:
            aporte_total = sum(
                (cantidad / 100.0) * datos_por_insumo.get(insumo.id, {}).get(nutriente, 0.0)
                for insumo, cantidad in composicion
            )
            valor_100g = round((aporte_total / rendimiento_gramos) * 100.0, 2)
            if porcion_declarada and porcion_declarada > 0:
                valor_porcion = round(valor_100g * (porcion_declarada / 100.0), 2)
                if vd:
                    porcentaje_vd = round((valor_porcion / vd) * 100)

        filas.append(
            schemas.FilaNutricionalNormativa(
                nutriente=nutriente,
                nombre=cfg["nombre"],
                subnivel=cfg["subnivel"],
                obligatorio=cfg["obligatorio"],
                valor_100g=valor_100g,
                valor_porcion=valor_porcion,
                porcentaje_vd=porcentaje_vd,
                completo=todos_tienen,
            )
        )

    tabla_completa = (
        rendimiento_gramos > 0
        and porcion_declarada is not None
        and porcion_declarada > 0
        # and bool(medida_casera_declarada) # no se si es de caracter obligatorio
        and all(fila.completo for fila in filas if fila.obligatorio)
    )

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
    )