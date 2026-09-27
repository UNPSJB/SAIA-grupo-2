import type {
    ElementoLimpieza,
    ElementoLimpiezaPayload,
    RecambioPayload
} from '../types/elementosLimpieza';

const BASE_URL = 'http://127.0.0.1:8000/elementos_limpieza';

export const getElementosLimpieza = async (): Promise<ElementoLimpieza[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Error al cargar elementos de limpieza");
    return res.json();
};

export const getAlertasRecambio = async (): Promise<ElementoLimpieza[]> => {
    const res = await fetch(`${BASE_URL}/alertas`);
    if (!res.ok) throw new Error("Error al cargar las alertas de recambio");
    return res.json();
};

export const getElementoLimpiezaById = async (id: string): Promise<ElementoLimpieza> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Error al cargar el elemento de limpieza");
    return res.json();
};

export const deleteElementoLimpieza = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    return res.ok;
};

export const saveElementoLimpieza = async (datos: ElementoLimpiezaPayload, id?: string): Promise<boolean> => {
    const url = id ? `${BASE_URL}/${id}` : `${BASE_URL}/`;
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};

export const registrarRecambio = async (id: string, datos: RecambioPayload = {}): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}/recambio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};
