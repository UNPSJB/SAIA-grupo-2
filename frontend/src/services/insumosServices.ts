import type { Insumo, InsumoPayload } from '../types/insumos';

const BASE_URL = 'http://127.0.0.1:8000/insumos';

export const getInsumos = async (): Promise<Insumo[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Error al cargar insumos");
    return res.json();
};

export const getInsumoById = async (id: string): Promise<Insumo> => {
    const res = await fetch(`${BASE_URL}/${id}/`);
    if (!res.ok) throw new Error("Error al cargar el insumo");
    return res.json();
};

export const deleteInsumo = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}/`, { method: 'DELETE' });
    return res.ok;
};

export const saveInsumo = async (datos: InsumoPayload, id?: string): Promise<boolean> => {
    const url = id ? `${BASE_URL}/${id}` : `${BASE_URL}/`;
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};
