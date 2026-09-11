import type { Capacidad } from './capacidades';

export interface Empleado {
    id: number;
    nombre: string;
    apellido: string;
    capacidades: Capacidad[];
}

export interface EmpleadoPayload {
    nombre: string;
    apellido: string;
    listaCapacidades: number[] | null;
}
