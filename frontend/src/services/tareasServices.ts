import type { Tarea, TareaPayload } from '../types/tareas';

const BASE_URL = 'http://127.0.0.1:8000/tareas';

export const getTareas = async (planId?: number): Promise<Tarea[]> => {
    const url = planId ? `${BASE_URL}/?plan_id=${planId}` : `${BASE_URL}/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error al cargar las tareas");
    return res.json();
};

export const getTareaById = async (id: string): Promise<Tarea> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Error al cargar la tarea");
    return res.json();
};

export const saveTarea = async (datos: TareaPayload, id?: string): Promise<boolean> => {
    const url = id ? `${BASE_URL}/${id}` : `${BASE_URL}/`;
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};

export const deleteTarea = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    return res.ok;
};