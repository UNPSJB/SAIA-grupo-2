import type { Equipo, EstadoMantenimiento } from '../../types/equipos';

export const COLOR_ESTADO: Record<EstadoMantenimiento, string> = {
    vencido: '#ef4444',
    proximo: '#f59e0b',
    vigente: '#22c55e',
    sin_control: '#6b7280'
};

export const ETIQUETA_ESTADO: Record<EstadoMantenimiento, string> = {
    vencido: 'Vencido',
    proximo: 'Próximo a vencer',
    vigente: 'Vigente',
    sin_control: 'Sin control'
};

export function textoMantenimiento(equipo: Equipo): string {
    if (equipo.dias_restantes === null) return 'Sin frecuencia definida';
    if (equipo.dias_restantes < 0) return `Vencido hace ${Math.abs(equipo.dias_restantes)} días`;
    if (equipo.dias_restantes === 0) return 'Vence hoy';
    if (equipo.dias_restantes === 1) return 'Vence mañana';
    return `Vence en ${equipo.dias_restantes} días`;
}
