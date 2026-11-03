export type GranularidadCumplimiento = 'dia' | 'semana';

export interface GraficoCumplimientoItem {
    periodo: string;
    esperadas: number;
    realizadas: number;
    porcentaje: number | null;
}

export interface GraficoCumplimientoResumen {
    fecha_desde: string;
    fecha_hasta: string;
    granularidad: GranularidadCumplimiento;
    serie: GraficoCumplimientoItem[];
}
