export type TipoIncidente =
    | 'rotura'
    | 'plaga'
    | 'devolucion_cliente'
    | 'otro';

export type EstadoIncidente = 'abierto' | 'cerrado';

export interface EmpleadoResumen {
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
}

export interface Incidente {
    id: number;
    descripcion: string;
    tipo: TipoIncidente;
    estado: EstadoIncidente;
    fecha_hora_reporte: string;
    empleado: EmpleadoResumen;
    archivo_url: string | null;
    archivo_nombre: string | null;
    dias_abierto: number | null;
    accion_correctiva: string | null;
    fecha_cierre: string | null;
    responsable_cierre: EmpleadoResumen | null;
}

export interface IncidentePayload {
    descripcion: string;
    empleado_id: number;
    tipo: TipoIncidente;
    archivo_url?: string | null;
    archivo_nombre?: string | null;
}

export interface FotoIncidentePayload {
    archivo_url: string;
    archivo_nombre?: string | null;
}
