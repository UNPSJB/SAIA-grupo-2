from datetime import date, datetime
from pathlib import Path
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, object_session

from src.empleados import services as empleados_services
from src.parametros_normativos import exceptions, schemas
from src.parametros_normativos.constants import ARCHIVO_PARAMETROS_INICIALES, EstadoConjunto
from src.parametros_normativos.models import (
    ClaseAditivoPorAgregado,
    ConjuntoParametros,
    CriterioSello,
    ExcepcionRotulado,
    ModuloRotuladoFrontal,
    ParametroGeneral,
    SelloPorAgregado,
    TextoSello,
)


def _publicados(db: Session) -> List[ConjuntoParametros]:
    return db.scalars(select(ConjuntoParametros).where(ConjuntoParametros.estado == EstadoConjunto.PUBLICADO)).all()


def buscar_vigente(db: Session, fecha: Optional[date] = None) -> Optional[ConjuntoParametros]:
    """Version publicada con la fecha de vigencia mas reciente que no sea posterior a la fecha indicada."""
    fecha = fecha or date.today()
    candidatos = [c for c in _publicados(db) if c.fecha_vigencia <= fecha]
    return max(candidatos, key=lambda c: (c.fecha_vigencia, c.version), default=None)


def conjunto_vigente(db: Session, fecha: Optional[date] = None) -> ConjuntoParametros:
    conjunto = buscar_vigente(db, fecha)
    if conjunto is None:
        raise exceptions.SinParametrosVigentes()
    return conjunto


def _con_vigencia(conjunto: ConjuntoParametros, vigente: Optional[ConjuntoParametros], esquema):
    datos = esquema.model_validate(conjunto)
    datos.vigente = vigente is not None and vigente.id == conjunto.id
    return datos


def listar_conjuntos(db: Session) -> List[schemas.ConjuntoResumen]:
    vigente = buscar_vigente(db)
    conjuntos = db.scalars(select(ConjuntoParametros).order_by(ConjuntoParametros.version.desc())).all()
    return [_con_vigencia(c, vigente, schemas.ConjuntoResumen) for c in conjuntos]


def leer_conjunto(db: Session, conjunto_id: int) -> ConjuntoParametros:
    conjunto = db.get(ConjuntoParametros, conjunto_id)
    if conjunto is None:
        raise exceptions.ConjuntoNoEncontrado()
    return conjunto


def detalle(db: Session, conjunto: ConjuntoParametros) -> schemas.ConjuntoDetalle:
    return _con_vigencia(conjunto, buscar_vigente(db), schemas.ConjuntoDetalle)


def _siguiente_version(db: Session) -> int:
    return (db.scalar(select(func.max(ConjuntoParametros.version))) or 0) + 1


def _validar_positivo(*valores: Optional[float]) -> None:
    if any(valor is not None and valor <= 0 for valor in valores):
        raise exceptions.ValorInvalido()


def _validar_textos(*textos: str) -> None:
    if any(not texto for texto in textos):
        raise exceptions.TextoVacio()


def _cargar_reglas(conjunto: ConjuntoParametros, reglas: List[schemas.ReglaAgregadoUpdate]) -> None:
    """Reemplaza las reglas. Las anteriores se borran antes de insertar para no chocar con la clave unica."""
    sesion = object_session(conjunto)
    if sesion is not None and conjunto.sellos_por_agregado:
        conjunto.sellos_por_agregado.clear()
        sesion.flush()
    conjunto.sellos_por_agregado = [
        SelloPorAgregado(agregado=regla.agregado, sello=sello) for regla in reglas for sello in dict.fromkeys(regla.sellos)
    ]


def _cargar_clases_aditivo(conjunto: ConjuntoParametros, clases: List[schemas.ClasesAditivoUpdate]) -> None:
    """Reemplaza las clases de aditivo que marcan agregados, sin repetir clases dentro de un mismo agregado."""
    for grupo in clases:
        _validar_textos(*grupo.clases)
    sesion = object_session(conjunto)
    if sesion is not None and conjunto.clases_aditivo:
        conjunto.clases_aditivo.clear()
        sesion.flush()
    conjunto.clases_aditivo = [
        ClaseAditivoPorAgregado(agregado=grupo.agregado, clase_funcional=clase)
        for grupo in clases
        for clase in dict.fromkeys(grupo.clases)
    ]


def _cargar_excepciones(conjunto: ConjuntoParametros, excepciones: List[str]) -> None:
    _validar_textos(*excepciones)
    conjunto.excepciones = [
        ExcepcionRotulado(descripcion=descripcion, orden=posicion) for posicion, descripcion in enumerate(excepciones)
    ]


def importar_conjunto(
    db: Session, datos: schemas.ConjuntoImportacion, empleado_id: Optional[int] = None, publicar: bool = True
) -> ConjuntoParametros:
    """Carga una version completa a partir de un archivo de datos, como la que trae el seed."""
    _validar_textos(datos.norma_origen.strip(), *(texto.texto for texto in datos.textos))
    _validar_positivo(*(c.limite for c in datos.criterios), *(c.factor_energetico for c in datos.criterios))
    ahora = datetime.now()
    conjunto = ConjuntoParametros(
        version=_siguiente_version(db),
        estado=EstadoConjunto.PUBLICADO if publicar else EstadoConjunto.BORRADOR,
        norma_origen=datos.norma_origen.strip(),
        fecha_vigencia=datos.fecha_vigencia,
        notas=datos.notas,
        fecha_creacion=ahora,
        creado_por_id=empleado_id,
        fecha_publicacion=ahora if publicar else None,
        publicado_por_id=empleado_id if publicar else None,
        criterios=[CriterioSello(orden=posicion, **c.model_dump()) for posicion, c in enumerate(datos.criterios)],
        textos=[TextoSello(sello=t.sello, texto=t.texto, orden=posicion) for posicion, t in enumerate(datos.textos)],
        parametros_generales=[ParametroGeneral(**p.model_dump()) for p in datos.parametros_generales],
    )
    _cargar_reglas(conjunto, datos.reglas)
    _cargar_clases_aditivo(conjunto, datos.clases_aditivo)
    _cargar_excepciones(conjunto, datos.excepciones)
    db.add(conjunto)
    db.commit()
    db.refresh(conjunto)
    return conjunto


def importar_archivo(
    db: Session, ruta: Path = ARCHIVO_PARAMETROS_INICIALES, empleado_id: Optional[int] = None
) -> ConjuntoParametros:
    datos = schemas.ConjuntoImportacion.model_validate_json(ruta.read_text(encoding="utf-8"))
    return importar_conjunto(db, datos, empleado_id)


def _base_por_defecto(db: Session) -> ConjuntoParametros:
    base = buscar_vigente(db) or max(_publicados(db), key=lambda c: c.version, default=None)
    if base is None:
        raise exceptions.SinParametrosVigentes()
    return base


def crear_borrador(db: Session, datos: schemas.NuevoBorrador) -> ConjuntoParametros:
    """Nueva version en borrador, copia de la indicada o de la vigente, para editarla sin tocar la publicada."""
    empleados_services.leer_empleado(db, datos.empleado_id)
    if db.scalar(select(ConjuntoParametros).where(ConjuntoParametros.estado == EstadoConjunto.BORRADOR)):
        raise exceptions.BorradorExistente()
    base = leer_conjunto(db, datos.base_id) if datos.base_id is not None else _base_por_defecto(db)

    borrador = ConjuntoParametros(
        version=_siguiente_version(db),
        estado=EstadoConjunto.BORRADOR,
        norma_origen=base.norma_origen,
        fecha_vigencia=base.fecha_vigencia,
        notas=base.notas,
        fecha_creacion=datetime.now(),
        creado_por_id=datos.empleado_id,
        criterios=[
            CriterioSello(
                sello=c.sello,
                tipo_producto=c.tipo_producto,
                forma=c.forma,
                nutriente=c.nutriente,
                limite=c.limite,
                unidad=c.unidad,
                factor_energetico=c.factor_energetico,
                condicion=c.condicion,
                orden=c.orden,
            )
            for c in base.criterios
        ],
        textos=[TextoSello(sello=t.sello, texto=t.texto, orden=t.orden) for t in base.textos],
        sellos_por_agregado=[SelloPorAgregado(agregado=r.agregado, sello=r.sello) for r in base.sellos_por_agregado],
        clases_aditivo=[
            ClaseAditivoPorAgregado(agregado=c.agregado, clase_funcional=c.clase_funcional) for c in base.clases_aditivo
        ],
        excepciones=[ExcepcionRotulado(descripcion=e.descripcion, orden=e.orden) for e in base.excepciones],
        parametros_generales=[
            ParametroGeneral(clave=p.clave, valor=p.valor, unidad=p.unidad, descripcion=p.descripcion)
            for p in base.parametros_generales
        ],
    )
    db.add(borrador)
    db.commit()
    db.refresh(borrador)
    return borrador


def _borrador(db: Session, conjunto_id: int) -> ConjuntoParametros:
    conjunto = leer_conjunto(db, conjunto_id)
    if conjunto.estado != EstadoConjunto.BORRADOR:
        raise exceptions.ConjuntoPublicado()
    return conjunto


def modificar_borrador(db: Session, conjunto_id: int, datos: schemas.BorradorUpdate) -> ConjuntoParametros:
    conjunto = _borrador(db, conjunto_id)
    try:
        if datos.norma_origen is not None:
            if not datos.norma_origen:
                raise exceptions.DatoObligatorio()
            conjunto.norma_origen = datos.norma_origen
        if datos.fecha_vigencia is not None:
            conjunto.fecha_vigencia = datos.fecha_vigencia
        if "notas" in datos.model_fields_set:
            conjunto.notas = (datos.notas or "").strip() or None

        if datos.criterios is not None:
            por_id = {c.id: c for c in conjunto.criterios}
            for cambio in datos.criterios:
                criterio = por_id.get(cambio.id)
                if criterio is None:
                    raise exceptions.ElementoInexistente()
                _validar_positivo(cambio.limite, cambio.factor_energetico)
                criterio.limite = cambio.limite
                if criterio.factor_energetico is not None:
                    if cambio.factor_energetico is None:
                        raise exceptions.ValorInvalido()
                    criterio.factor_energetico = cambio.factor_energetico

        if datos.textos is not None:
            por_sello = {t.sello: t for t in conjunto.textos}
            for cambio in datos.textos:
                if cambio.sello not in por_sello:
                    raise exceptions.ElementoInexistente()
                _validar_textos(cambio.texto)
                por_sello[cambio.sello].texto = cambio.texto

        if datos.reglas is not None:
            _cargar_reglas(conjunto, datos.reglas)

        if datos.clases_aditivo is not None:
            _cargar_clases_aditivo(conjunto, datos.clases_aditivo)

        if datos.excepciones is not None:
            _cargar_excepciones(conjunto, datos.excepciones)

        if datos.parametros_generales is not None:
            por_clave = {p.clave: p for p in conjunto.parametros_generales}
            for cambio in datos.parametros_generales:
                if cambio.clave not in por_clave:
                    raise exceptions.ElementoInexistente()
                _validar_positivo(cambio.valor)
                por_clave[cambio.clave].valor = cambio.valor
    except Exception:
        db.rollback()
        raise

    db.commit()
    db.refresh(conjunto)
    return conjunto


def publicar(db: Session, conjunto_id: int, datos: schemas.Publicacion) -> ConjuntoParametros:
    """Cierra el borrador: desde ahi es de solo lectura y rige a partir de su fecha de vigencia."""
    empleados_services.leer_empleado(db, datos.empleado_id)
    conjunto = _borrador(db, conjunto_id)
    if not conjunto.norma_origen or conjunto.fecha_vigencia is None:
        raise exceptions.DatoObligatorio()
    conjunto.estado = EstadoConjunto.PUBLICADO
    conjunto.fecha_publicacion = datetime.now()
    conjunto.publicado_por_id = datos.empleado_id
    db.commit()
    db.refresh(conjunto)
    return conjunto


def descartar_borrador(db: Session, conjunto_id: int) -> None:
    db.delete(_borrador(db, conjunto_id))
    db.commit()


def leer_modulo(db: Session) -> ModuloRotuladoFrontal:
    modulo = db.scalar(select(ModuloRotuladoFrontal))
    if modulo is None:
        modulo = ModuloRotuladoFrontal(activo=True)
        db.add(modulo)
        db.commit()
        db.refresh(modulo)
    return modulo


def cambiar_modulo(db: Session, datos: schemas.CambioModulo) -> ModuloRotuladoFrontal:
    empleados_services.leer_empleado(db, datos.empleado_id)
    modulo = leer_modulo(db)
    modulo.activo = datos.activo
    modulo.fecha_cambio = datetime.now()
    modulo.cambiado_por_id = datos.empleado_id
    db.commit()
    db.refresh(modulo)
    return modulo


def verificar_modulo_activo(db: Session) -> None:
    if not leer_modulo(db).activo:
        raise exceptions.ModuloDesactivado()
