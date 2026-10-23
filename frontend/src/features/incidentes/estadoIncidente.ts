import type { EstadoIncidente, TipoIncidente } from '../../types/incidentes';

export const DIAS_PARA_DESTACAR_ANTIGUEDAD = 15;

export const COLOR_ESTADO: Record<EstadoIncidente, string> = {
    abierto: 'var(--rojo-texto)',
    cerrado: 'var(--verde-texto)',
};

export const ETIQUETA_ESTADO: Record<EstadoIncidente, string> = {
    abierto: 'Abierto',
    cerrado: 'Cerrado',
};

export const ETIQUETA_TIPO: Record<TipoIncidente, string> = {
    rotura: 'Rotura',
    plaga: 'Plaga',
    devolucion_cliente: 'Devolución de cliente',
    otro: 'Otro',
};

export const TIPOS_INCIDENTE: TipoIncidente[] = [
    'rotura',
    'plaga',
    'devolucion_cliente',
    'otro',
];

export const ESTADOS_INCIDENTE: EstadoIncidente[] = ['abierto', 'cerrado'];

export function formatearFechaHora(fechaHora: string): string {
    const momento = new Date(fechaHora);
    if (Number.isNaN(momento.getTime())) return fechaHora;

    const dia = String(momento.getDate()).padStart(2, '0');
    const mes = String(momento.getMonth() + 1).padStart(2, '0');
    const hora = String(momento.getHours()).padStart(2, '0');
    const minuto = String(momento.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${momento.getFullYear()} ${hora}:${minuto}`;
}

export function textoAntiguedad(diasAbierto: number | null): string {
    if (diasAbierto === null) return '—';
    if (diasAbierto === 0) return 'Hoy';
    if (diasAbierto === 1) return '1 día';
    return `${diasAbierto} días`;
}

export function nombreCompleto(persona: { nombre: string; apellido: string }): string {
    return `${persona.nombre} ${persona.apellido}`;
}
