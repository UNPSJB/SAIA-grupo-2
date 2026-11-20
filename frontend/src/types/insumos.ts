import type { UnidadMedida } from './unidadesMedida';

export interface Insumo {
    id: number;
    nombre: string;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
    activo: boolean;
    cantidad: number;
    es_aditivo?: boolean;
    aditivo_referencia_id?: number | null;
}

export interface InsumoPayload {
    nombre: string;
    unidad_medida_id: number;
    activo?: boolean;
    es_aditivo?: boolean;
    aditivo_referencia_id?: number | null;
}
