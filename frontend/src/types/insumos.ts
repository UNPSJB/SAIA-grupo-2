//import type { Capacidad } from './capacidades';
import type {UnidadMedida} from './unidadesMedida'
export interface Insumo {
    id: number;
    nombre: string;
    unidad_medida_id:number;
    unidad_medida:UnidadMedida;
    //capacidades: Capacidad[];
}

export interface InsumoPayload {
    nombre: string;
    unidad_medida_id:number;
    //listaCapacidades: number[] | null;
}
