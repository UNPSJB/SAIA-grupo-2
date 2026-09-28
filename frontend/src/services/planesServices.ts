import type { PlanLimpieza, PlanLimpiezaPayload } from '../types/planes';

const BASE_URL = 'http://127.0.0.1:8000/planes';

export const getPlanes = async (): Promise<PlanLimpieza[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Error al cargar los planes");
    return res.json();
};

export const getPlanById = async (id: string): Promise<PlanLimpieza> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Error al cargar el plan");
    return res.json();
};

export const savePlan = async (datos: PlanLimpiezaPayload, id?: string): Promise<boolean> => {
    const url = id ? `${BASE_URL}/${id}` : `${BASE_URL}/`;
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};

export const deletePlan = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    return res.ok;
};