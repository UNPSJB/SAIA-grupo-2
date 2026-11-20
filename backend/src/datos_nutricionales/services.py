from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.alimentos_referencia import services as alimentos_services
from src.datos_nutricionales import exceptions, schemas
from src.datos_nutricionales.constants import (
    TOLERANCIA_MODIFICACION,
    FuenteDatoNutricional,
    Nutriente,
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
    (Nutriente.AZUCARES_ANADIDOS, 50.0, "g", 0.5, 1),
    (Nutriente.PROTEINAS, 50.0, "g", 0.5, 1),
    (Nutriente.GRASAS_TOTALES, 55.0, "g", 0.5, 1),
    (Nutriente.GRASAS_SATURADAS, 22.0, "g", 0.5, 1),
    (Nutriente.GRASAS_TRANS, None, "g", 0.1, 1),
    (Nutriente.FIBRA_ALIMENTARIA, 25.0, "g", 0.5, 1),
    (Nutriente.SODIO, 2000.0, "mg", 5.0, 0),
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
    return obtener_datos_insumo(db, insumo_id)


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
