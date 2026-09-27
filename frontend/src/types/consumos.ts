export interface ConsumoPayload {
    insumo_id: number;
    cantidad_consumida: number;
    tarea_asociada: string;
    fecha_registro: string;
}

export interface ConsumoAcumulado {
    insumo_id: number;
    nombre_insumo: string;
    unidad_medida: string;
    cantidad_total: number;
}