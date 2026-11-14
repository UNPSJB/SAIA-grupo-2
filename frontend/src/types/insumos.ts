import type { UnidadMedida } from './unidadesMedida';

export interface Insumo {
    id: number;
    nombre: string;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
    activo: boolean;
    cantidad: number;
}

export interface InsumoPayload {
    nombre: string;
    unidad_medida_id: number;
    activo?: boolean;
}
