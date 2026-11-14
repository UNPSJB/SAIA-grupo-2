import type { LoteProduccion } from '../../types/lotesProduccion';

function fechaHora(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    const dia = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return `${dia} ${hora}`;
}

export function textoEstado(lote: LoteProduccion): string {
    if (!lote.cerrado) return 'Abierto: el consumo se puede corregir hasta que se cierre (como máximo, al terminar el día).';
    const momento = lote.fecha_cierre ? ` · ${fechaHora(lote.fecha_cierre)}` : '';
    if (lote.cerrado_por) return `Cerrado por ${lote.cerrado_por.nombre} ${lote.cerrado_por.apellido}${momento}`;
    return `Cerrado automáticamente al terminar el día${momento}`;
}
