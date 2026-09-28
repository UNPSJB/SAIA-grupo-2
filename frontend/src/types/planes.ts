export interface PlanLimpieza {
    id: number;
    titulo: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    sector_id: number;
    sector: { id: number; nombre: string };
    equipos: { id: number; nombre: string }[];
    tareas: { id: number; titulo: string }[];
}

export interface PlanLimpiezaPayload {
    titulo: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    sector_id: number;
    equipos_ids: number[];
    tareas_ids: number[];
}