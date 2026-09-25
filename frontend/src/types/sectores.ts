export interface EmpleadoRef {
    id: number;
    nombre: string;
    apellido: string;
    legajo: string;
}

export interface EquipoRef {
    id: number;
    nombre: string;
    activo: boolean;
}

export interface Sector {
    id: number;
    nombre: string;
    responsable_id: number | null;
    responsable: EmpleadoRef | null;
    empleados: EmpleadoRef[];
    equipos: EquipoRef[];
}

export interface SectorPayload {
    nombre: string;
    responsable_id: number | null;
    listaEmpleados: number[] | null;
}