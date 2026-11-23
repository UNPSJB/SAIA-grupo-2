
import json
from datetime import datetime
from typing import Any, List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.aditivos.models import Aditivo, ClaseFuncionalAditivo
from src.alergenos import services as alergenos_services
from src.alergenos.constants import EstadoDeclaracion
from src.datos_nutricionales.constants import (
    NOTA_PIE_VALORES_DIARIOS,
    NUTRIENTES_TABLA_NORMATIVA,
    EstadoTablaNutricional,
)
from src.datos_nutricionales.models import DatoNutricionalInsumo
from src.empleados.models import Empleado, RolEmpleado
from src.insumos.models import Insumo
from src.lotes_produccion.models import LoteProduccion
from src.parametros_normativos import services as parametros_services
from src.parametros_normativos.constants import LEYENDAS_PRECAUTORIAS, SelloAdvertencia
from src.productos.models import Producto
from src.recetas.models import DetalleReceta, Receta, VersionReceta, EstadoVersionReceta
from src.recetas import services as recetas_services
from src.rotulado_frontal.constants import ResultadoAplicabilidad
from src.rotulado_frontal import services as frontal_services
from src.rotulado_frontal.models import CalculoSellosRotulado, EvaluacionAplicabilidad

from src.rotulados import schemas
from src.rotulados.models import ExportacionRotulo, HistorialCambioRotulo, Rotulo, RotuloLote
from src.unidades_medida.models import UnidadMedida



def _verificar_admin(db: Session, empleado_id: int) -> Empleado:
    empleado = db.get(Empleado, empleado_id)

    if empleado is None or not empleado.activo:
        raise HTTPException(status_code=401, detail="Empleado no válido.")

    if empleado.rol != RolEmpleado.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Solo un administrador puede gestionar los rótulos."
        )

    return empleado


def _leer_rotulo(db: Session, rotulo_id: int) -> Rotulo:
    rotulo = db.get(Rotulo, rotulo_id)

    if rotulo is None:
        raise HTTPException(status_code=404, detail="Rótulo no encontrado.")

    return rotulo


def _leer_producto(db: Session, producto_id: int) -> Producto:
    producto = db.get(Producto, producto_id)

    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")

    return producto


def serializar_valor(valor: Any) -> Optional[str]:
    if valor is None:
        return None

    if isinstance(valor, (dict, list, tuple)):
        return json.dumps(valor, ensure_ascii=False, default=str)

    return str(valor)


def _registrar_cambio(
    db: Session,
    rotulo_id: int,
    campo: str,
    valor_original: Any,
    valor_nuevo: Any,
    empleado_id: int,
) -> None:
    if valor_original == valor_nuevo:
        return

    cambio = HistorialCambioRotulo(
        rotulo_id=rotulo_id,
        campo=campo,
        valor_original=serializar_valor(valor_original),
        valor_nuevo=serializar_valor(valor_nuevo),
        empleado_id=empleado_id,
        fecha_cambio=datetime.now(),
    )
    db.add(cambio)



LEYENDA_BORRADOR = (
    "BORRADOR: debe ser revisado por un/a profesional y por la autoridad sanitaria competente antes de su uso"
)

MOTIVO_SIN_ADVERTENCIAS = {
    ResultadoAplicabilidad.NO_ENVASADO: "No corresponden advertencias: el producto no se envasa en ausencia del cliente.",
    ResultadoAplicabilidad.EXCEPTUADO: "No corresponden advertencias: el producto está exceptuado del rotulado frontal.",
    ResultadoAplicabilidad.SIN_AGREGADOS: (
        "No corresponden advertencias: el producto no agrega azúcares, grasas, sodio, edulcorantes ni cafeína."
    ),
}


def _version_vigente(db: Session, producto_id: int) -> Optional[VersionReceta]:
    receta = db.scalar(select(Receta).where(Receta.producto_id == producto_id))
    if receta is None:
        return None
    return db.scalar(
        select(VersionReceta)
        .where(
            VersionReceta.receta_id == receta.id,
            VersionReceta.estado == EstadoVersionReceta.ACTIVO,
        )
        .order_by(VersionReceta.version.desc())
    )


def _modulo_frontal_activo(db: Session) -> bool:
    return parametros_services.leer_modulo(db).activo


def _ultima_evaluacion(db: Session, producto_id: int) -> Optional[EvaluacionAplicabilidad]:
    return db.scalar(
        select(EvaluacionAplicabilidad)
        .where(EvaluacionAplicabilidad.producto_id == producto_id)
        .order_by(
            EvaluacionAplicabilidad.fecha.desc(),
            EvaluacionAplicabilidad.id.desc(),
        )
    )


def _ultimo_calculo(db: Session, producto_id: int) -> Optional[CalculoSellosRotulado]:
    return db.scalar(
        select(CalculoSellosRotulado)
        .where(CalculoSellosRotulado.producto_id == producto_id)
        .order_by(CalculoSellosRotulado.fecha_calculo.desc(), CalculoSellosRotulado.id.desc())
    )


def _sellos_actuales(db: Session, producto_id: int) -> dict:
    """Sellos y leyendas que surgen de E12: el ultimo calculo si corresponden advertencias, ninguno si no corresponden.

    Queda en None mientras falte evaluar o calcular, o si el modulo de rotulado frontal esta desactivado.
    """
    sin_datos = {"sellos_snapshot": None, "calculo_sellos_id": None}
    if not _modulo_frontal_activo(db):
        return sin_datos
    evaluacion = _ultima_evaluacion(db, producto_id)
    if evaluacion is None:
        return sin_datos
    if evaluacion.resultado != ResultadoAplicabilidad.CORRESPONDE:
        return {"sellos_snapshot": [], "calculo_sellos_id": None}
    calculo = _ultimo_calculo(db, producto_id)
    if calculo is None:
        return sin_datos
    return {"sellos_snapshot": list(calculo.sellos_obtenidos), "calculo_sellos_id": calculo.id}


def _obtener_snapshots(
    db: Session,
    producto_id: int,
) -> dict:
    """Datos que el sistema ya tiene: lista de ingredientes (E10), tabla nutricional (E11) y sellos (E12)."""
    ingredientes_snapshot = None
    lista_ingredientes = None
    nutricion_snapshot = None
    receta_id = None
    receta_version = None

    version = _version_vigente(db, producto_id)
    if version is not None:
        lista = recetas_services.obtener_lista_ingredientes_rotulo(db, version.receta_id, version.version)
        nutricion = recetas_services.calcular_informacion_nutricional_receta(db, version.receta_id, version.version)
        ingredientes_snapshot = lista.model_dump(mode="json")
        lista_ingredientes = lista.texto_rotulo or None
        nutricion_snapshot = nutricion.model_dump(mode="json")
        receta_id = version.receta_id
        receta_version = version.version

    return {
        "ingredientes_snapshot": ingredientes_snapshot,
        "lista_ingredientes": lista_ingredientes,
        "nutricion_snapshot": nutricion_snapshot,
        **_sellos_actuales(db, producto_id),
        "receta_id": receta_id,
        "receta_version": receta_version,
    }


def crear_rotulo(
    db: Session,
    datos: schemas.RotuloCrear,
    empleado_id: int,
) -> Rotulo:
    _verificar_admin(db, empleado_id)
    _leer_producto(db, datos.producto_id)

    existente = db.scalar(
        select(Rotulo).where(Rotulo.producto_id == datos.producto_id)
    )

    if existente is not None:
        raise HTTPException(
            status_code=409,
            detail="El producto ya tiene un borrador de rótulo."
        )

    snapshots = _obtener_snapshots(db, datos.producto_id)

    rotulo = Rotulo(
        **datos.model_dump(exclude={"producto_id"}),
        producto_id=datos.producto_id,
        **snapshots,
    )

    db.add(rotulo)
    db.commit()
    db.refresh(rotulo)

    return rotulo


def obtener_rotulo(db: Session, rotulo_id: int) -> Rotulo:
    return _leer_rotulo(db, rotulo_id)


def obtener_rotulo_producto(db: Session, producto_id: int) -> Optional[Rotulo]:
    _leer_producto(db, producto_id)

    return db.scalar(
        select(Rotulo).where(Rotulo.producto_id == producto_id)
    )


def listar_rotulos(db: Session) -> list[Rotulo]:
    return db.scalars(
        select(Rotulo).order_by(Rotulo.fecha_actualizacion.desc())
    ).all()



def actualizar_rotulo(
    db: Session,
    rotulo_id: int,
    datos: schemas.RotuloActualizar,
    empleado_id: int,
) -> Rotulo:
    _verificar_admin(db, empleado_id)
    rotulo = _leer_rotulo(db, rotulo_id)

    cambios = datos.model_dump(exclude_unset=True)

    for campo, valor_nuevo in cambios.items():
        valor_original = getattr(rotulo, campo)

        if valor_original == valor_nuevo:
            continue

        _registrar_cambio(
            db,
            rotulo.id,
            campo,
            valor_original,
            valor_nuevo,
            empleado_id,
        )

        setattr(rotulo, campo, valor_nuevo)

    rotulo.fecha_actualizacion = datetime.now()

    db.commit()
    db.refresh(rotulo)

    return rotulo



def actualizar_snapshots(
    db: Session,
    rotulo_id: int,
    empleado_id: int,
) -> Rotulo:
    _verificar_admin(db, empleado_id)
    rotulo = _leer_rotulo(db, rotulo_id)

    snapshots = _obtener_snapshots(db, rotulo.producto_id)

    for campo, valor_nuevo in snapshots.items():
        valor_original = getattr(rotulo, campo)

        _registrar_cambio(
            db,
            rotulo.id,
            campo,
            valor_original,
            valor_nuevo,
            empleado_id,
        )

        setattr(rotulo, campo, valor_nuevo)

    rotulo.fecha_actualizacion = datetime.now()

    db.commit()
    db.refresh(rotulo)

    return rotulo



def asociar_lote(
    db: Session,
    rotulo_id: int,
    datos: schemas.RotuloLoteCrear,
    empleado_id: int,
) -> RotuloLote:
    _verificar_admin(db, empleado_id)
    rotulo = _leer_rotulo(db, rotulo_id)

    lote = db.get(LoteProduccion, datos.nro_lote)

    if lote is None:
        raise HTTPException(status_code=404, detail="Lote no encontrado.")

    if lote.producto_id != rotulo.producto_id:
        raise HTTPException(
            status_code=400,
            detail="El lote no corresponde al producto del rótulo."
        )

    existente = db.scalar(
        select(RotuloLote).where(
            RotuloLote.rotulo_id == rotulo_id,
            RotuloLote.nro_lote == datos.nro_lote,
        )
    )

    if existente is not None:
        raise HTTPException(
            status_code=409,
            detail="El lote ya está asociado a este rótulo."
        )

    rotulo_lote = RotuloLote(
        rotulo_id=rotulo_id,
        nro_lote=datos.nro_lote,
        fecha_duracion=datos.fecha_duracion,
    )

    db.add(rotulo_lote)
    db.commit()
    db.refresh(rotulo_lote)

    return rotulo_lote


def actualizar_rotulo_lote(
    db: Session,
    rotulo_lote_id: int,
    datos: schemas.RotuloLoteActualizar,
    empleado_id: int,
) -> RotuloLote:
    _verificar_admin(db, empleado_id)

    rotulo_lote = db.get(RotuloLote, rotulo_lote_id)

    if rotulo_lote is None:
        raise HTTPException(
            status_code=404,
            detail="Asociación entre rótulo y lote no encontrada."
        )

    cambios = datos.model_dump(exclude_unset=True)

    for campo, valor_nuevo in cambios.items():
        valor_original = getattr(rotulo_lote, campo)

        if valor_original == valor_nuevo:
            continue

        _registrar_cambio(
            db,
            rotulo_lote.rotulo_id,
            f"lote:{rotulo_lote.nro_lote}.{campo}",
            valor_original,
            valor_nuevo,
            empleado_id,
        )

        setattr(rotulo_lote, campo, valor_nuevo)

    db.commit()
    db.refresh(rotulo_lote)

    return rotulo_lote


def listar_lotes_rotulo(
    db: Session,
    rotulo_id: int,
) -> list[RotuloLote]:
    _leer_rotulo(db, rotulo_id)

    return db.scalars(
        select(RotuloLote)
        .where(RotuloLote.rotulo_id == rotulo_id)
        .order_by(RotuloLote.nro_lote.desc())
    ).all()



def listar_historial(
    db: Session,
    rotulo_id: int,
) -> list[dict]:
    _leer_rotulo(db, rotulo_id)

    filas = db.execute(
        select(
            HistorialCambioRotulo,
            Empleado.nombre,
            Empleado.apellido,
        )
        .outerjoin(
            Empleado,
            HistorialCambioRotulo.empleado_id == Empleado.id,
        )
        .where(HistorialCambioRotulo.rotulo_id == rotulo_id)
        .order_by(
            HistorialCambioRotulo.fecha_cambio.desc(),
            HistorialCambioRotulo.id.desc(),
        )
    ).all()

    return [
        {
            "id": cambio.id,
            "rotulo_id": cambio.rotulo_id,
            "campo": cambio.campo,
            "valor_original": cambio.valor_original,
            "valor_nuevo": cambio.valor_nuevo,
            "empleado_id": cambio.empleado_id,
            "empleado_nombre": nombre,
            "empleado_apellido": apellido,
            "fecha_cambio": cambio.fecha_cambio,
        }
        for cambio, nombre, apellido in filas
    ]




CAMPOS_REQUERIDOS = {
    "denominacion_venta": "Denominación de venta",
    "lista_ingredientes": "Lista de ingredientes",
    "contenido_neto": "Contenido neto",
    "unidad_contenido_neto": "Unidad del contenido neto",
    "rnpa_rppa": "RNPA/RPPA",
    "razon_social": "Razón social",
    "domicilio": "Domicilio del elaborador",
    "nutricion_snapshot": "Información nutricional",
}

CAMPOS_IMPORTADOR = {
    "razon_social_importador": "Razón social del importador",
    "domicilio_importador": "Domicilio del importador",
    "pais_origen": "País de origen",
}


def _vacio(valor: Any) -> bool:
    return valor is None or (isinstance(valor, str) and not valor.strip())


def _leer_rotulo_lote(db: Session, rotulo: Rotulo, rotulo_lote_id: int) -> RotuloLote:
    rotulo_lote = db.get(RotuloLote, rotulo_lote_id)
    if rotulo_lote is None or rotulo_lote.rotulo_id != rotulo.id:
        raise HTTPException(
            status_code=404,
            detail="Asociación entre rótulo y lote no encontrada."
        )
    return rotulo_lote


def _faltantes_sellos(db: Session, rotulo: Rotulo) -> List[str]:
    if rotulo.sellos_snapshot is not None or not _modulo_frontal_activo(db):
        return []
    if _ultima_evaluacion(db, rotulo.producto_id) is None:
        return ["Evaluación de rotulado frontal"]
    return ["Cálculo de sellos de advertencia"]


def calcular_completitud(
    db: Session,
    rotulo_id: int,
    rotulo_lote_id: Optional[int] = None,
) -> dict:
    """Campos obligatorios del Capitulo V del CAA que faltan. No impide guardar el borrador."""
    rotulo = _leer_rotulo(db, rotulo_id)

    requeridos = dict(CAMPOS_REQUERIDOS)
    if rotulo.es_importado:
        requeridos.update(CAMPOS_IMPORTADOR)

    faltantes = [descripcion for campo, descripcion in requeridos.items() if _vacio(getattr(rotulo, campo))]
    total = len(requeridos)

    sellos = _faltantes_sellos(db, rotulo)
    faltantes.extend(sellos)
    total += 1

    if rotulo_lote_id is not None:
        lotes = [_leer_rotulo_lote(db, rotulo, rotulo_lote_id)]
    else:
        lotes = rotulo.lotes

    if not lotes:
        total += 1
        faltantes.append("Asociación a un lote de producción")
    for lote in lotes:
        total += 1
        if lote.fecha_duracion is None:
            faltantes.append(f"Fecha de duración del lote {lote.nro_lote}")

    cumplidos = total - len(faltantes)
    porcentaje = round((cumplidos / total) * 100, 2) if total else 0

    return {
        "rotulo_id": rotulo_id,
        "porcentaje_completitud": porcentaje,
        "completo": len(faltantes) == 0,
        "faltantes": faltantes,
    }


def _tabla_vista(snapshot: Optional[dict]) -> Optional[schemas.TablaNutricionalVista]:
    if not snapshot:
        return None
    items = {item["nutriente"]: item for item in snapshot.get("items", [])}
    filas = []
    for definicion in NUTRIENTES_TABLA_NORMATIVA:
        item = items.get(definicion["nutriente"].value)
        if item is None:
            continue
        filas.append(
            schemas.FilaNutricionalVista(
                nutriente=item["nutriente"],
                nombre=definicion["nombre"],
                subnivel=definicion["subnivel"],
                valor_100g=item.get("valor_100g_expresado") or "-",
                valor_porcion=item.get("valor_porcion_expresado") or "-",
                porcentaje_vd=item.get("porcentaje_vd_expresado") or "-",
            )
        )
    return schemas.TablaNutricionalVista(
        estado=snapshot.get("estado") or EstadoTablaNutricional.COMPLETA,
        porcion_gramos=snapshot.get("unidad_venta_gramos") or 0,
        medida_casera=snapshot.get("medida_casera"),
        filas=filas,
        insumos_sin_datos=[f["insumo_nombre"] for f in snapshot.get("faltantes", [])],
        nota_pie=NOTA_PIE_VALORES_DIARIOS,
    )


def _cara_principal(db: Session, rotulo: Rotulo, advertencias: List[str]) -> schemas.CaraPrincipal:
    cara = schemas.CaraPrincipal(
        denominacion_venta=rotulo.denominacion_venta,
        contenido_neto=rotulo.contenido_neto,
        unidad_contenido_neto=rotulo.unidad_contenido_neto,
    )
    if not _modulo_frontal_activo(db):
        cara.motivo = "El módulo de rotulado frontal está desactivado: no se muestran advertencias."
        return cara

    evaluacion = _ultima_evaluacion(db, rotulo.producto_id)
    if evaluacion is None:
        cara.motivo = "Falta evaluar si al producto le corresponde el sistema de advertencias."
        advertencias.append(cara.motivo)
        return cara

    cara.resultado_aplicabilidad = evaluacion.resultado
    if evaluacion.resultado != ResultadoAplicabilidad.CORRESPONDE:
        cara.aplica_advertencias = False
        cara.motivo = MOTIVO_SIN_ADVERTENCIAS[evaluacion.resultado]
        return cara

    cara.aplica_advertencias = True
    calculo = db.get(CalculoSellosRotulado, rotulo.calculo_sellos_id) if rotulo.calculo_sellos_id else None
    if calculo is None or rotulo.sellos_snapshot is None:
        cara.motivo = "Falta calcular los sellos de advertencia del producto."
        advertencias.append(cara.motivo)
        return cara

    textos = {t.sello: t.texto for t in calculo.parametros.textos}
    orden = {t.sello: t.orden for t in calculo.parametros.textos}
    capturados = sorted(
        (SelloAdvertencia(s) for s in rotulo.sellos_snapshot), key=lambda sello: orden.get(sello, len(orden))
    )
    cara.sellos = [
        schemas.SelloVista(sello=s, texto=textos.get(s, s.value)) for s in capturados if s not in LEYENDAS_PRECAUTORIAS
    ]
    cara.leyendas = [
        schemas.SelloVista(sello=s, texto=textos.get(s, s.value)) for s in capturados if s in LEYENDAS_PRECAUTORIAS
    ]
    cara.calculo_provisorio = calculo.provisorio
    cara.parametros_version = calculo.parametros.version
    cara.parametros_fecha_vigencia = calculo.parametros.fecha_vigencia
    cara.receta_version_calculo = calculo.version_receta
    if not cara.sellos and not cara.leyendas:
        cara.motivo = "Según el cálculo de sellos, no le corresponden octógonos ni leyendas precautorias."

    if calculo.provisorio:
        advertencias.append("El cálculo de sellos es provisorio: la tabla nutricional estaba incompleta al calcularlo.")
    if rotulo.receta_version is not None and calculo.version_receta != rotulo.receta_version:
        advertencias.append(
            f"Los sellos se calcularon con la versión {calculo.version_receta} de la receta y el rótulo "
            f"usa la versión {rotulo.receta_version}: recalculá los sellos."
        )
    if evaluacion.fecha > calculo.fecha_calculo:
        advertencias.append("La evaluación de rotulado frontal cambió después del cálculo de sellos: recalculá los sellos.")
    return cara


def _alergenos(db: Session, rotulo: Rotulo, advertencias: List[str]) -> tuple:
    detalle = alergenos_services.detalle_producto(db, rotulo.producto_id)
    if detalle.declaracion is not None:
        estado = detalle.declaracion.estado
    elif detalle.propuesta.tiene_receta:
        estado = EstadoDeclaracion.SUGERIDA
    else:
        estado = None
    if estado == EstadoDeclaracion.SUGERIDA:
        advertencias.append(
            "La declaración de alérgenos es la sugerida por el sistema: falta que una persona con permiso de administrar la confirme."
        )
    if detalle.propuesta_cambio:
        advertencias.append("La receta cambió desde que se guardó la declaración de alérgenos: revisala.")
    vista = schemas.AlergenosVista(
        contiene=detalle.leyendas.contiene,
        puede_contener=detalle.leyendas.puede_contener,
        estado=estado,
    )
    return vista, detalle.leyendas.conservacion


def _lote_vista(rotulo_lote: RotuloLote) -> schemas.LoteVista:
    return schemas.LoteVista(
        rotulo_lote_id=rotulo_lote.id,
        nro_lote=rotulo_lote.nro_lote,
        fecha_elaboracion=rotulo_lote.lote.fecha,
        fecha_duracion=rotulo_lote.fecha_duracion,
    )


def obtener_vista_previa(
    db: Session,
    rotulo_id: int,
    rotulo_lote_id: Optional[int] = None,
) -> schemas.VistaPreviaRotulo:
    """Arma la vista previa del borrador con lo guardado en el rotulo y advierte lo que falta o quedo desactualizado."""
    rotulo = _leer_rotulo(db, rotulo_id)
    advertencias: List[str] = []

    lotes = sorted(rotulo.lotes, key=lambda l: (l.fecha_creacion, l.id), reverse=True)
    if rotulo_lote_id is not None:
        seleccionado = _leer_rotulo_lote(db, rotulo, rotulo_lote_id)
    else:
        seleccionado = lotes[0] if lotes else None
    completitud = calcular_completitud(db, rotulo_id, seleccionado.id if seleccionado else None)

    cara = _cara_principal(db, rotulo, advertencias)
    alergenos, conservacion_alergenos = _alergenos(db, rotulo, advertencias)

    tabla = _tabla_vista(rotulo.nutricion_snapshot)
    if tabla is not None and tabla.estado == EstadoTablaNutricional.INCOMPLETA:
        sin_datos = ", ".join(tabla.insumos_sin_datos)
        advertencias.append(
            "La tabla nutricional está incompleta"
            + (f": faltan datos nutricionales de {sin_datos}." if sin_datos else ".")
        )

    vigente = _version_vigente(db, rotulo.producto_id)
    receta_vigente = vigente.version if vigente else None
    if rotulo.receta_version is not None and receta_vigente != rotulo.receta_version:
        advertencias.append(
            f"El borrador usa la versión {rotulo.receta_version} de la receta, pero la vigente es "
            f"la {receta_vigente}: actualizá los datos automáticos."
        )

    return schemas.VistaPreviaRotulo(
        rotulo_id=rotulo.id,
        producto=schemas.ProductoVista.model_validate(rotulo.producto),
        leyenda_borrador=LEYENDA_BORRADOR,
        cara_principal=cara,
        lista_ingredientes=rotulo.lista_ingredientes,
        alergenos=alergenos,
        origen=schemas.OrigenVista(
            razon_social=rotulo.razon_social,
            domicilio=rotulo.domicilio,
            rnpa_rppa=rotulo.rnpa_rppa,
            es_importado=rotulo.es_importado,
            razon_social_importador=rotulo.razon_social_importador,
            domicilio_importador=rotulo.domicilio_importador,
            pais_origen=rotulo.pais_origen,
        ),
        lote=_lote_vista(seleccionado) if seleccionado else None,
        lotes=[_lote_vista(l) for l in lotes],
        conservacion=(rotulo.instrucciones_conservacion or "").strip() or conservacion_alergenos,
        instrucciones_uso=(rotulo.instrucciones_uso or "").strip() or None,
        tabla_nutricional=tabla,
        receta_version=rotulo.receta_version,
        receta_version_vigente=receta_vigente,
        advertencias=advertencias,
        faltantes=completitud["faltantes"],
        completo=completitud["completo"] and not advertencias,
        fecha_generacion=datetime.now(),
    )


def _receta_respaldo(db: Session, version: VersionReceta) -> dict:
    detalles = db.scalars(
        select(DetalleReceta)
        .where(
            DetalleReceta.receta_id == version.receta_id,
            DetalleReceta.nro_version == version.version,
        )
        .order_by(DetalleReceta.renglon)
    ).all()
    renglones = []
    for detalle in detalles:
        insumo = db.get(Insumo, detalle.insumo_id)
        unidad = db.get(UnidadMedida, detalle.unidad_medida_id)
        aditivo = db.get(Aditivo, detalle.aditivo_id) if detalle.aditivo_id else None
        clase = db.get(ClaseFuncionalAditivo, aditivo.clase_funcional_id) if aditivo else None
        renglones.append(
            {
                "renglon": detalle.renglon,
                "insumo": insumo.nombre if insumo else f"Insumo {detalle.insumo_id}",
                "cantidad_original": detalle.cantidad_original,
                "unidad": unidad.nombre if unidad else None,
                "cantidad_gramos": round(detalle.cantidad_gramos, 2),
                "tipo_uso": detalle.tipo_uso.value,
                "aditivo": (
                    {
                        "nombre": aditivo.nombre_completo,
                        "numero_ins": aditivo.numero_ins,
                        "funcion": clase.nombre if clase else None,
                    }
                    if aditivo
                    else None
                ),
            }
        )
    return {
        "receta_id": version.receta_id,
        "version": version.version,
        "estado": version.estado.value,
        "fecha_vigencia": version.fecha_vigencia,
        "motivo_cambio": version.motivo_cambio,
        "rendimiento_final_gramos": version.rendimiento_final_gramos,
        "unidad_venta_gramos": version.unidad_venta_gramos,
        "medida_casera": version.medida_casera,
        "renglones": renglones,
    }


def _fuentes_nutricionales(db: Session, version: VersionReceta) -> List[dict]:
    insumo_ids = list(dict.fromkeys(d.insumo_id for d in version.detalles))
    fuentes = []
    for insumo_id in insumo_ids:
        insumo = db.get(Insumo, insumo_id)
        datos = db.scalars(
            select(DatoNutricionalInsumo)
            .where(DatoNutricionalInsumo.insumo_id == insumo_id)
            .order_by(DatoNutricionalInsumo.id)
        ).all()
        fuentes.append(
            {
                "insumo": insumo.nombre if insumo else f"Insumo {insumo_id}",
                "datos": [
                    {
                        "nutriente": dato.nutriente.value,
                        "valor_100g": dato.valor,
                        "fuente": dato.fuente.value,
                        "referencia": dato.referencia or (dato.alimento_codigo and f"Alimento {dato.alimento_codigo}"),
                        "modificado": dato.modificado,
                        "fecha_carga": dato.fecha_carga,
                    }
                    for dato in datos
                ],
            }
        )
    return fuentes


def _armar_respaldo(db: Session, rotulo: Rotulo, fecha: datetime) -> tuple:
    """Junta el borrador tal como se ve en la vista previa y el anexo de calculos que lo respalda.

    Se usan los datos que tiene guardados el rotulo (version de receta, tabla y calculo de sellos);
    no se recalcula nada al exportar.
    """
    vista = obtener_vista_previa(db, rotulo.id)
    version = None
    if rotulo.receta_id is not None and rotulo.receta_version is not None:
        version = db.scalar(
            select(VersionReceta).where(
                VersionReceta.receta_id == rotulo.receta_id,
                VersionReceta.version == rotulo.receta_version,
            )
        )
    calculo = db.get(CalculoSellosRotulado, rotulo.calculo_sellos_id) if rotulo.calculo_sellos_id else None

    respaldo = {
        "tipo": "borrador",
        "leyenda_borrador": LEYENDA_BORRADOR,
        "fecha_exportacion": fecha,
        "borrador": vista.model_dump(mode="json"),
        "receta": _receta_respaldo(db, version) if version else None,
        "composicion": (
            recetas_services.calcular_composicion_receta(db, version.receta_id, version.version).model_dump(mode="json")
            if version
            else None
        ),
        "tabla_nutricional": {
            "calculo": rotulo.nutricion_snapshot,
            "fuentes": _fuentes_nutricionales(db, version) if version else [],
        },
        "calculo_sellos": (
            frontal_services.resultado_de_calculo(db, calculo).model_dump(mode="json") if calculo else None
        ),
    }
    return json.loads(json.dumps(respaldo, ensure_ascii=False, default=str)), calculo


def crear_exportacion(
    db: Session,
    rotulo_id: int,
    empleado_id: int,
) -> ExportacionRotulo:
    """Registra la exportacion del borrador con su respaldo de calculo, la fecha y la version de receta usada."""
    _verificar_admin(db, empleado_id)
    rotulo = _leer_rotulo(db, rotulo_id)
    fecha = datetime.now()
    respaldo, calculo = _armar_respaldo(db, rotulo, fecha)

    exportacion = ExportacionRotulo(
        rotulo_id=rotulo_id,
        empleado_id=empleado_id,
        fecha_exportacion=fecha,
        receta_id=rotulo.receta_id,
        version_receta=rotulo.receta_version,
        calculo_sellos_id=calculo.id if calculo else None,
        parametros_id=calculo.parametros_id if calculo else None,
        version_parametros=calculo.parametros.version if calculo else None,
        respaldo_snapshot=respaldo,
    )
    db.add(exportacion)
    db.commit()
    db.refresh(exportacion)
    return exportacion


def listar_exportaciones(
    db: Session,
    rotulo_id: int,
) -> list[ExportacionRotulo]:
    _leer_rotulo(db, rotulo_id)
    return db.scalars(
        select(ExportacionRotulo)
        .where(ExportacionRotulo.rotulo_id == rotulo_id)
        .order_by(
            ExportacionRotulo.fecha_exportacion.desc(),
            ExportacionRotulo.id.desc(),
        )
    ).all()


def obtener_exportacion(
    db: Session,
    rotulo_id: int,
    exportacion_id: int,
) -> ExportacionRotulo:
    exportacion = db.get(ExportacionRotulo, exportacion_id)
    if exportacion is None or exportacion.rotulo_id != rotulo_id:
        raise HTTPException(
            status_code=404,
            detail="Exportación no encontrada.",
        )
    return exportacion
