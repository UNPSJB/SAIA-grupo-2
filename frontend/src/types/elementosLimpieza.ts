export type EstadoRecambio = 'vencido' | 'proximo' | 'vigente' | 'sin_control';

export interface ElementoLimpieza {
    id: number;
    nombre: string;
    frecuencia_recambio_dias: number | null;
    fecha_ultimo_recambio: string;
    fecha_proximo_recambio: string | null;
    dias_restantes: number | null;
    estado_recambio: EstadoRecambio;
}

export interface ElementoLimpiezaPayload {
    nombre: string;
    frecuencia_recambio_dias: number | null;
    fecha_ultimo_recambio?: string | null;
}

export interface RecambioPayload {
    fecha_recambio?: string | null;
}
