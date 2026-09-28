import type { ChecklistItem, ChecklistMarcarPayload, RegistroChecklistDetalle, HistorialChecklistResumen } from '../types/checklists';

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

export const marcarTareaCompletada = async (tareaId: number, payload: ChecklistMarcarPayload): Promise<{ ok: boolean; mensaje?: string }> => {
    try {
        const response = await fetch(`${API_URL}/${tareaId}/marcar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            return { ok: true };
        }
        const data = await response.json().catch(() => null);
        const mensaje = data?.detail || 'Hubo un error al guardar el registro.';
        return { ok: false, mensaje };
    } catch (error) {
        console.error('Error en marcarTareaCompletada:', error);
        return { ok: false, mensaje: 'Error de conexión con el servidor.' };
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

export const getHistorialChecklists = async (fechaInicio?: string, fechaFin?: string, sectorId?: string): Promise<HistorialChecklistResumen> => {
    try {
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fecha_inicio', fechaInicio);
        if (fechaFin) params.append('fecha_fin', fechaFin);
        if (sectorId && sectorId !== 'todos') params.append('sector_id', sectorId);

        const url = `${API_URL}/historial?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al consultar el historial de checklists');
        return await response.json();
    } catch (error) {
        console.error('Error en getHistorialChecklists:', error);
        throw error;
    }
};
