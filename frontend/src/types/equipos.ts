export interface TipoEquipo {
    id: number;
    nombre: string;
}

export interface Equipo {
    id: number;
    nombre: string;
    activo: boolean;
    tipo: TipoEquipo;
    ubicacion: string;
}

export interface EquipoPayload {
    nombre: string;
    activo: boolean;
    tipo_id: number;
    ubicacion: string;
}