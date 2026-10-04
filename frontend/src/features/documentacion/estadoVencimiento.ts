import type { EstadoVencimiento, TipoDocumentacion } from '../../types/documentacion';

export const COLOR_ESTADO: Record<EstadoVencimiento, string> = {
    vencido: '#ef4444',
    proximo: '#f59e0b',
    vigente: '#22c55e',
};

export const ETIQUETA_ESTADO: Record<EstadoVencimiento, string> = {
    vencido: 'Vencido',
    proximo: 'Próximo a vencer',
    vigente: 'Vigente',
};

export const ETIQUETA_TIPO: Record<TipoDocumentacion, string> = {
    libreta_sanitaria: 'Libreta sanitaria',
    capacitacion: 'Capacitación',
    certificado_aptitud_fisica: 'Certificado de aptitud física',
};

export const TIPOS_DOCUMENTACION: TipoDocumentacion[] = [
    'libreta_sanitaria',
    'capacitacion',
    'certificado_aptitud_fisica',
];

export function textoVencimiento(diasRestantes: number): string {
    if (diasRestantes < 0) return `Vencido hace ${Math.abs(diasRestantes)} días`;
    if (diasRestantes === 0) return 'Vence hoy';
    if (diasRestantes === 1) return 'Vence mañana';
    return `Vence en ${diasRestantes} días`;
}

export function formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
}
