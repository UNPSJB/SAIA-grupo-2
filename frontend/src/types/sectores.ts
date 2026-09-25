import type { Empleado } from './empleados';

export interface Sector {
    id: number;
    nombre: string;
    responsable_id: number | null;
    responsable: Empleado | null;
    empleados: Empleado[];
}

export interface SectorPayload {
    nombre: string;
    responsable_id: number | null;
    listaEmpleados: number[] | null;
}