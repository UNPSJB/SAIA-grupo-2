
import json
from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.empleados.models import Empleado, RolEmpleado
from src.lotes_produccion.models import LoteProduccion
from src.productos.models import Producto
from src.recetas.models import Receta, VersionReceta, EstadoVersionReceta
from src.recetas import services as recetas_services
from src.rotulado_frontal.models import EvaluacionAplicabilidad

from src.rotulados import schemas
from src.rotulados.models import Rotulo, RotuloLote, HistorialCambioRotulo


# ---------------------------------------------------------------------
# Validaciones comunes
# ---------------------------------------------------------------------

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
        valor_original=(
            json.dumps(valor_original, ensure_ascii=False, default=str)
            if valor_original is not None else None
        ),
        valor_nuevo=(
            json.dumps(valor_nuevo, ensure_ascii=False, default=str)
            if valor_nuevo is not None else None
        ),
        empleado_id=empleado_id,
        fecha_cambio=datetime.now(),
    )
    db.add(cambio)


# ---------------------------------------------------------------------
# Datos automáticos: receta y rotulado frontal
# ---------------------------------------------------------------------

def _obtener_snapshots(
    db: Session,
    producto_id: int,
) -> dict:
    receta = db.scalar(
        select(Receta).where(Receta.producto_id == producto_id)
    )

    ingredientes_snapshot = None
    nutricion_snapshot = None
    receta_id = None
    receta_version = None

    if receta is not None:
        version = db.scalar(
            select(VersionReceta)
            .where(
                VersionReceta.receta_id == receta.id,
                VersionReceta.estado == EstadoVersionReceta.ACTIVO,
            )
            .order_by(VersionReceta.version.desc())
        )

        if version is not None:
            composicion = recetas_services.calcular_composicion_receta(
                db, receta.id, version.version
            )
            nutricion = recetas_services.calcular_informacion_nutricional_receta(
                db, receta.id, version.version
            )

            ingredientes_snapshot = (
                composicion.model_dump(mode="json")
            )
            nutricion_snapshot = nutricion.model_dump(mode="json")

            receta_id = receta.id
            receta_version = version.version

    evaluacion = db.scalar(
        select(EvaluacionAplicabilidad)
        .where(EvaluacionAplicabilidad.producto_id == producto_id)
        .order_by(
            EvaluacionAplicabilidad.fecha.desc(),
            EvaluacionAplicabilidad.id.desc(),
        )
    )

    sellos_snapshot = (
        list(evaluacion.sellos) if evaluacion is not None else None
    )

    return {
        "ingredientes_snapshot": ingredientes_snapshot,
        "nutricion_snapshot": nutricion_snapshot,
        "sellos_snapshot": sellos_snapshot,
        "receta_id": receta_id,
        "receta_version": receta_version,
    }


# ---------------------------------------------------------------------
# Crear y consultar rótulos
# ---------------------------------------------------------------------

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


# ---------------------------------------------------------------------
# Actualizar datos manuales y registrar historial
# ---------------------------------------------------------------------

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


# ---------------------------------------------------------------------
# Actualizar fotografías de datos automáticos
# ---------------------------------------------------------------------

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


# ---------------------------------------------------------------------
# Asociar el borrador a un lote de producción
# ---------------------------------------------------------------------

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


# ---------------------------------------------------------------------
# Historial
# ---------------------------------------------------------------------

def listar_historial(
    db: Session,
    rotulo_id: int,
) -> list[HistorialCambioRotulo]:
    _leer_rotulo(db, rotulo_id)

    return db.scalars(
        select(HistorialCambioRotulo)
        .where(HistorialCambioRotulo.rotulo_id == rotulo_id)
        .order_by(
            HistorialCambioRotulo.fecha_cambio.desc(),
            HistorialCambioRotulo.id.desc(),
        )
    ).all()


# ---------------------------------------------------------------------
# Completitud del rótulo
# ---------------------------------------------------------------------


def calcular_completitud(
    db: Session,
    rotulo_id: int,
    rotulo_lote_id: Optional[int] = None,
) -> dict:
    rotulo = _leer_rotulo(db, rotulo_id)

    faltantes = []
    total = 0
    cumplidos = 0

    campos_requeridos = {
        "denominacion_venta": "Denominación de venta",
        "contenido_neto": "Contenido neto",
        "unidad_contenido_neto": "Unidad del contenido neto",
        "rnpa_rppa": "RNPA/RPPA",
        "razon_social": "Razón social",
        "domicilio": "Domicilio del elaborador",
        "ingredientes_snapshot": "Ingredientes",
        "nutricion_snapshot": "Información nutricional",
    }

    # Datos generales del rótulo.
    for campo, descripcion in campos_requeridos.items():
        total += 1
        valor = getattr(rotulo, campo)

        if valor is None or (
            isinstance(valor, str) and not valor.strip()
        ):
            faltantes.append(descripcion)
        else:
            cumplidos += 1

    # Datos adicionales para productos importados.
    if rotulo.es_importado:
        campos_importador = {
            "razon_social_importador": "Razón social del importador",
            "domicilio_importador": "Domicilio del importador",
            "pais_origen": "País de origen",
        }

        for campo, descripcion in campos_importador.items():
            total += 1
            valor = getattr(rotulo, campo)

            if valor is None or (
                isinstance(valor, str) and not valor.strip()
            ):
                faltantes.append(descripcion)
            else:
                cumplidos += 1

    # Fecha de duración correspondiente a un lote específico.
    if rotulo_lote_id is not None:
        rotulo_lote = db.get(RotuloLote, rotulo_lote_id)

        if rotulo_lote is None or rotulo_lote.rotulo_id != rotulo_id:
            raise HTTPException(
                status_code=404,
                detail="Asociación entre rótulo y lote no encontrada."
            )

        total += 1

        if rotulo_lote.fecha_duracion is None:
            faltantes.append(
                f"Fecha de duración del lote {rotulo_lote.nro_lote}"
            )
        else:
            cumplidos += 1

    # Fecha de duración de todos los lotes asociados.
    else:
        lotes = rotulo.lotes

        if not lotes:
            total += 1
            faltantes.append("Asociación a un lote de producción")
        else:
            for lote in lotes:
                total += 1

                if lote.fecha_duracion is None:
                    faltantes.append(
                        f"Fecha de duración del lote {lote.nro_lote}"
                    )
                else:
                    cumplidos += 1

    porcentaje = round((cumplidos / total) * 100, 2) if total else 0

    return {
        "rotulo_id": rotulo_id,
        "porcentaje_completitud": porcentaje,
        "completo": len(faltantes) == 0,
        "faltantes": faltantes,
    }
