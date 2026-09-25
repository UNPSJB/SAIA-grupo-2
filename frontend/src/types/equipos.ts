export interface TipoEquipo {
    id: number;
    nombre: string;
}
export interface SectorRef {
    id: number;
    nombre: string;
}

export interface Equipo {
    id: number;
    nombre: string;
    activo: boolean;
    tipo: TipoEquipo;
    sector: SectorRef; 
}

export interface EquipoPayload {
    nombre: string;
    activo: boolean;
    tipo_id: number;
    sector_id: number;
}