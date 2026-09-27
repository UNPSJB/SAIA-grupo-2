import type { ElementoLimpieza, EstadoRecambio } from '../../types/elementosLimpieza';

export const COLOR_ESTADO: Record<EstadoRecambio, string> = {
    vencido: '#ef4444',
    proximo: '#f59e0b',
    vigente: '#22c55e',
    sin_control: '#6b7280'
};

export const ETIQUETA_ESTADO: Record<EstadoRecambio, string> = {
    vencido: 'Vencido',
    proximo: 'Próximo a vencer',
    vigente: 'Vigente',
    sin_control: 'Sin control'
};

export function textoRecambio(elemento: ElementoLimpieza): string {
    if (elemento.dias_restantes === null) return 'Sin frecuencia definida';
    if (elemento.dias_restantes < 0) return `Vencido hace ${Math.abs(elemento.dias_restantes)} días`;
    if (elemento.dias_restantes === 0) return 'Vence hoy';
    if (elemento.dias_restantes === 1) return 'Vence mañana';
    return `Vence en ${elemento.dias_restantes} días`;
}
