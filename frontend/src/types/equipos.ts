export type TipoEquipo = 'heladera' | 'horno' | 'balanza' | 'termometro'

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
    tipo: TipoEquipo;
    ubicacion: string;
    
}
