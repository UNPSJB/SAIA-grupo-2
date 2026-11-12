import type { UnidadMedida } from './unidadesMedida';

export interface Insumo {
    id: number;
    nombre: string;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;

    //nuevo
     cantidad?: number;
}

export interface InsumoPayload {
    nombre: string;
    unidad_medida_id: number;

    //nuevo
    cantidad?: number;
}
