
export interface EmpleadoResumen {
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
}

export type TipoDocumentacion =
    | 'libreta_sanitaria'
    | 'capacitacion'
    | 'certificado_aptitud_fisica';

export type EstadoVencimiento = 'vencido' | 'proximo' | 'vigente';

export interface Documentacion {
    id: number;
    empleado_id: number;
    tipo: TipoDocumentacion;
    fecha_vencimiento: string;
    dias_restantes: number;
    estado: EstadoVencimiento;
    dias_aviso_previo: number;
    empleado: EmpleadoResumen;
    numero_carnet: string | null;
    autoridad_emisora: string | null;
    titulo: string | null;
    observaciones: string | null;
    nombre_medico: string | null;
    matricula: string | null;
}

export interface DocumentacionPayload {
    tipo: TipoDocumentacion;
    empleado_id: number;
    fecha_vencimiento: string;
    numero_carnet?: string;
    autoridad_emisora?: string;
    titulo?: string;
    observaciones?: string | null;
    nombre_medico?: string;
    matricula?: string;
}

export interface DocumentacionUpdatePayload {
    fecha_vencimiento: string;
    numero_carnet?: string;
    autoridad_emisora?: string;
    titulo?: string;
    observaciones?: string | null;
    nombre_medico?: string;
    matricula?: string;
}

export interface AlertaVencimiento {
    id: number;
    tipo: TipoDocumentacion;
    descripcion: string;
    empleado: EmpleadoResumen;
    fecha_vencimiento: string;
    dias_restantes: number;
    estado: EstadoVencimiento;
}

export interface RequisitoDocumentacion {
    tipo: TipoDocumentacion;
    obligatorio: boolean;
    dias_aviso_previo: number;
}

export interface CumplimientoEmpleado {
    empleado: EmpleadoResumen;
    completo: boolean;
    faltantes: TipoDocumentacion[];
    vencidos: TipoDocumentacion[];
}
