import logging
from datetime import date
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.documentacion import models as doc_models
from src.documentacion.constants import TipoDocumentacion
from src.documentacion.services import _descripcion as _descripcion_documento
from src.elementos_limpieza import models as elem_models
from src.equipos import models as equipo_models
from src.equipos.constants import EstadoMantenimiento
from src.elementos_limpieza.constants import EstadoRecambio
from src.vencimientos.schemas import (
    CategoriaVencimiento,
    ItemVencimientoConsolidado,
    ResumenVencimientos,
)
from src.vencimientos.vencimientos import EstadoVencimiento

logger = logging.getLogger(__name__)

ORDEN_URGENCIA = {
    EstadoVencimiento.VENCIDO: 0,
    EstadoVencimiento.PROXIMO: 1,
    EstadoVencimiento.VIGENTE: 2,
}

TITULOS_TIPO_DOC = {
    TipoDocumentacion.LIBRETA_SANITARIA: "Libreta Sanitaria",
    TipoDocumentacion.CAPACITACION: "Capacitación de Personal",
    TipoDocumentacion.CERTIFICADO_APTITUD_FISICA: "Certificado de Aptitud Física",
}


def _mapear_estado_recambio(estado_recambio: EstadoRecambio) -> EstadoVencimiento:
    if estado_recambio == EstadoRecambio.VENCIDO:
        return EstadoVencimiento.VENCIDO
    if estado_recambio == EstadoRecambio.PROXIMO:
        return EstadoVencimiento.PROXIMO
    return EstadoVencimiento.VIGENTE


def _mapear_estado_mantenimiento(estado: EstadoMantenimiento) -> EstadoVencimiento:
    if estado == EstadoMantenimiento.VENCIDO:
        return EstadoVencimiento.VENCIDO
    if estado == EstadoMantenimiento.PROXIMO:
        return EstadoVencimiento.PROXIMO
    return EstadoVencimiento.VIGENTE


def obtener_vencimientos_consolidados(
    db: Session,
    categoria: Optional[CategoriaVencimiento] = None,
    estado: Optional[EstadoVencimiento] = None,
) -> ResumenVencimientos:
    items: List[ItemVencimientoConsolidado] = []
    hoy = date.today()

    consulta_doc = select(doc_models.Documentacion).options(
        selectinload(doc_models.Documentacion.empleado)
    )
    documentos = db.scalars(consulta_doc).all()

    for d in documentos:
        es_personal = d.tipo == TipoDocumentacion.LIBRETA_SANITARIA
        cat = CategoriaVencimiento.PERSONAL if es_personal else CategoriaVencimiento.DOCUMENTOS
        cat_label = "Vencimiento Personal" if es_personal else "Documentación General"

        nombre_emp = (
            f"{d.empleado.nombre} {d.empleado.apellido} ({d.empleado.legajo})"
            if d.empleado
            else "Empleado No Especificado"
        )

        items.append(
            ItemVencimientoConsolidado(
                id=f"doc-{d.id}",
                categoria=cat,
                categoria_label=cat_label,
                titulo=TITULOS_TIPO_DOC.get(d.tipo, "Documento"),
                detalle=_descripcion_documento(d),
                referencia=nombre_emp,
                fecha_vencimiento=d.fecha_vencimiento,
                dias_restantes=d.dias_restantes,
                estado=d.estado,
                bloqueado=False,
            )
        )

    consulta_elem = select(elem_models.ElementoLimpieza).where(
        elem_models.ElementoLimpieza.frecuencia_recambio_dias.isnot(None)
    )
    elementos = db.scalars(consulta_elem).all()

    for e in elementos:
        proxima = e.fecha_proximo_recambio
        if proxima is not None:
            st = _mapear_estado_recambio(e.estado_recambio)
            dias = e.dias_restantes if e.dias_restantes is not None else (proxima - hoy).days

            items.append(
                ItemVencimientoConsolidado(
                    id=f"elem-{e.id}",
                    categoria=CategoriaVencimiento.EQUIPOS,
                    categoria_label="Elementos y Equipamiento",
                    titulo=f"Recambio: {e.nombre}",
                    detalle=f"Frecuencia de recambio: cada {e.frecuencia_recambio_dias} días",
                    referencia=f"Último recambio: {e.fecha_ultimo_recambio.strftime('%d/%m/%Y')}",
                    fecha_vencimiento=proxima,
                    dias_restantes=dias,
                    estado=st,
                    bloqueado=False,
                )
            )

    consulta_calib = select(equipo_models.Equipo).options(
        selectinload(equipo_models.Equipo.sector)
    ).where(equipo_models.Equipo.frecuencia_mantenimiento_dias.isnot(None))
    equipos = db.scalars(consulta_calib).all()

    for eq in equipos:
        proxima = eq.fecha_proximo_mantenimiento
        if proxima is None:
            continue

        sector_nombre = eq.sector.nombre if eq.sector else "Sin sector"

        items.append(
            ItemVencimientoConsolidado(
                id=f"calib-{eq.id}",
                categoria=CategoriaVencimiento.CALIBRACION,
                categoria_label="Calibración y Mantenimiento",
                titulo=f"Calibración: {eq.nombre}",
                detalle=f"Periodicidad: cada {eq.frecuencia_mantenimiento_dias} días",
                referencia=f"Sector {sector_nombre} · Último: {eq.fecha_ultimo_mantenimiento.strftime('%d/%m/%Y')}",
                fecha_vencimiento=proxima,
                dias_restantes=eq.dias_restantes if eq.dias_restantes is not None else (proxima - hoy).days,
                estado=_mapear_estado_mantenimiento(eq.estado_mantenimiento),
                bloqueado=False,
            )
        )

    if categoria is not None:
        items = [i for i in items if i.categoria == categoria]

    if estado is not None:
        items = [i for i in items if i.estado == estado]

    items.sort(key=lambda i: (ORDEN_URGENCIA[i.estado], i.dias_restantes))

    vencidos_cnt = sum(1 for i in items if i.estado == EstadoVencimiento.VENCIDO)
    proximos_cnt = sum(1 for i in items if i.estado == EstadoVencimiento.PROXIMO)
    vigentes_cnt = sum(1 for i in items if i.estado == EstadoVencimiento.VIGENTE)

    return ResumenVencimientos(
        total=len(items),
        vencidos=vencidos_cnt,
        proximos=proximos_cnt,
        vigentes=vigentes_cnt,
        items=items,
    )
