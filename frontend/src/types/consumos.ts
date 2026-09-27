export interface ConsumoPayload {
    producto_limpieza_id: number;
    cantidad_consumida: number;
    tarea_id: number;
    fecha_registro: string;
}

export interface ConsumoAcumulado {
    producto_limpieza_id: number;
    nombre_producto: string;
    unidad_medida: string;
    cantidad_total: number;
}

export interface ConsumoDetallado {
    id: number;
    fecha_registro: string;
    nombre_producto: string;
    titulo_tarea: string;
    cantidad_consumida: number;
    unidad_medida: string;
}