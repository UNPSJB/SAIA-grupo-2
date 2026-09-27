export type FrecuenciaTarea = 'diaria' | 'semanal';

export interface PlanResumen {
    id: number;
    titulo: string;
}

export interface ProductoLimpiezaResumen {
    id: number;
    nombre: string; 
}

export interface ConsumoEstimado {
    id: number;
    cantidad: number;
    producto_limpieza: ProductoLimpiezaResumen;
}

export interface ConsumoEstimadoCreate {
    producto_limpieza_id: number;
    cantidad: number;
}

export interface Tarea {
    id: number;
    titulo: string;
    frecuencia: FrecuenciaTarea;
    planes: PlanResumen[];
    consumos_estimados: ConsumoEstimado[];
}

export interface TareaPayload {
    titulo: string;
    frecuencia: FrecuenciaTarea;
    planes: number[];
    consumos_estimados: ConsumoEstimadoCreate[];
}