export type EstadoEquipo = 'bueno' | 'danado';
export type EstadoMantenimiento = 'vigente' | 'proximo' | 'vencido' | 'sin_control';

export interface TipoEquipo {
    id: number;
    nombre: string;
}

export interface Equipo {
    id: number;
    nombre: string;
    activo: boolean;
    sector_id: number;
    tipo_id: number;
    estado: EstadoEquipo;
    frecuencia_mantenimiento_dias: number | null;
    fecha_ultimo_mantenimiento: string;
    fecha_proximo_mantenimiento: string | null;
    dias_restantes: number | null;
    estado_mantenimiento: EstadoMantenimiento;
    tipo: TipoEquipo;
    sector: { id: number; nombre: string };
}

export interface EquipoPayload {
    nombre: string;
    activo: boolean;
    sector_id: number;
    tipo_id: number;
    estado: EstadoEquipo;
    frecuencia_mantenimiento_dias: number | null;
    fecha_ultimo_mantenimiento?: string | null;
}