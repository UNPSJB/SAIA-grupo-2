import type { UnidadMedida } from './unidadesMedida';

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

export interface ProduccionPorProducto {
    producto_id: number;
    producto: string;
    unidad_medida: UnidadMedida;
    cantidad: number;
}

export interface EvolucionProduccionItem {
    fecha: string;
    producto_id: number;
    producto: string;
    unidad_medida: UnidadMedida;
    cantidad: number;
}

export interface EstadisticasProduccion {
    totales_por_producto: ProduccionPorProducto[];
    evolucion_por_producto: EvolucionProduccionItem[];
}