export type EstadoEquipo = 'bueno' | 'danado';

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
    tipo: TipoEquipo;
    sector: { id: number; nombre: string };
}

export interface EquipoPayload {
    nombre: string;
    activo: boolean;
    sector_id: number;
    tipo_id: number;
    estado: EstadoEquipo;
}