import type { ChecklistItem, ChecklistMarcarPayload, RegistroChecklistDetalle } from '../types/checklists';

const API_URL = 'http://127.0.0.1:8000/checklists';

export const getChecklistHoy = async (empleadoId?: number): Promise<ChecklistItem[]> => {
    try {
        const url = empleadoId ? `${API_URL}/hoy?empleado_id=${empleadoId}` : `${API_URL}/hoy`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener el checklist del día');
        return await response.json();
    } catch (error) {
        console.error('Error en getChecklistHoy:', error);
        throw error;
    }
};

export const marcarTareaCompletada = async (tareaId: number, payload: ChecklistMarcarPayload): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}/${tareaId}/marcar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (error) {
        console.error('Error en marcarTareaCompletada:', error);
        return false;
    }
};

export const getDetalleTareaRealizada = async (tareaId: number, planId?: number): Promise<RegistroChecklistDetalle | null> => {
    try {
        const url = `${API_URL}/detalle?tarea_id=${tareaId}&plan_id=${planId || 0}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener el detalle de la tarea realizada');
        return await response.json();
    } catch (error) {
        console.error('Error en getDetalleTareaRealizada:', error);
        return null;
    }
};
