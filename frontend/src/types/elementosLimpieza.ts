export interface ElementoLimpieza {
    id: number;
    nombre: string;
    frecuencia_recambio_dias: number | null;
}

export interface ElementoLimpiezaPayload {
    nombre: string;
    frecuencia_recambio_dias: number | null;
}
