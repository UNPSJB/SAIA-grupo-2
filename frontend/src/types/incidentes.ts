export type TipoIncidente =
    | 'rotura'
    | 'plaga'
    | 'devolucion_cliente'
    | 'otro';

export type EstadoIncidente = 'abierto' | 'cerrado';

export type TipoMovimiento = 'cierre' | 'reapertura';

export interface EmpleadoResumen {
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
}

export interface MovimientoIncidente {
    id: number;
    tipo: TipoMovimiento;
    descripcion: string;
    fecha_hora: string;
    empleado: EmpleadoResumen;
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
    movimientos: MovimientoIncidente[];
}

export interface IncidentePayload {
    descripcion: string;
    empleado_id: number;
    tipo: TipoIncidente;
    archivo_url?: string | null;
    archivo_nombre?: string | null;
}

export interface CierrePayload {
    accion_correctiva: string;
    responsable_id: number;
}

export interface ReaperturaPayload {
    motivo: string;
    responsable_id: number;
}

export interface FotoIncidentePayload {
    archivo_url: string;
    archivo_nombre?: string | null;
}

export interface ConteoPorTipo {
    tipo: TipoIncidente;
    cantidad: number;
}

export interface ResumenIncidentes {
    abiertos: number;
    cerrados: number;
    total: number;
    abiertos_por_tipo: ConteoPorTipo[];
}
