import type { UnidadMedida } from './unidadesMedida';
import type { Aditivo } from './aditivos';

export interface Insumo {
    id: number;
    nombre: string;
    denominacion_rotulo?: string | null;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
    activo: boolean;
    cantidad: number;
    es_aditivo?: boolean;
    aditivo_referencia_id?: number | null;
    aditivo_referencia?: Aditivo | null;
    densidad_g_ml?: number | null;
    peso_por_unidad_gramos?: number | null;
}

export interface InsumoPayload {
    nombre: string;
    denominacion_rotulo?: string | null;
    unidad_medida_id: number;
    activo?: boolean;
    es_aditivo?: boolean;
    aditivo_referencia_id?: number | null;
    densidad_g_ml?: number | null;
    peso_por_unidad_gramos?: number | null;
}
