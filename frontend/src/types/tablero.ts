export interface GraficoCumplimientoItem{
    periodo: string;
    porcentaje: number;
}

export interface GraficoCumplimientoResumen{
    fecha_desde: string;
    fecha_hasta: string;
    granularidad: 'dia'|'semana';
    serie: GraficoCumplimientoItem[];
}