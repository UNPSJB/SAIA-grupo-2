export interface ChecklistItem {
    tarea_id: number;
    titulo_tarea: string;
    frecuencia: string;
    plan_id: number;
    plan_titulo: string;
    sector_nombre: string;
    estado: 'pendiente' | 'realizada';
}

export interface ConsumoRealCreate {
    producto_limpieza_id: number;
    cantidad: number;
}

export interface ChecklistMarcarPayload {
    plan_id?: number;
    empleado_id: number;
    observaciones?: string;
    evidencia_url?: string;
    consumos: ConsumoRealCreate[];
}

export interface ConsumoRealResumen {
    id: number;
    producto_limpieza_id: number;
    nombre_producto?: string;
    cantidad: number;
}

export interface RegistroChecklistDetalle {
    id: number;
    tarea_id: number;
    plan_id?: number;
    fecha_programada: string;
    realizada: boolean;
    fecha_hora_completada?: string;
    empleado_id?: number;
    nombre_empleado?: string;
    titulo_tarea?: string;
    plan_titulo?: string;
    sector_nombre?: string;
    evidencia_url?: string;
    observaciones?: string;
    consumos_reales: ConsumoRealResumen[];
}
