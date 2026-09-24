import type { Capacidad } from './capacidades';

export interface Empleado {
    id: number;
    legajo: string;
    dni: string;
    nombre: string;
    apellido: string;
    activo: boolean;
    capacidades: Capacidad[];
}

export interface EmpleadoPayload {
    dni: string;
    nombre: string;
    apellido: string;
    activo: boolean;
    listaCapacidades: number[] | null;
}