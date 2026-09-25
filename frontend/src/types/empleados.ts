import type { Capacidad } from './capacidades';

export interface SectorRef {
    id: number;
    nombre: string;
}

export interface Empleado {
    id: number;
    legajo: string;
    dni: string;
    nombre: string;
    apellido: string;
    activo: boolean;
    capacidades: Capacidad[];
    sectores: SectorRef[];
}

export interface EmpleadoPayload {
    dni: string;
    nombre: string;
    apellido: string;
    activo: boolean;
    listaCapacidades: number[] | null;
    listaSectores: number[] | null; 
}