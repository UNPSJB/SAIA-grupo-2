import type { UnidadMedida as UnidadMedida, UnidadMedidaPayload } from '../types/unidadesMedida';

const BASE_URL = 'http://127.0.0.1:8000/unidades_medida';

export const getUnidadesMedida = async (): Promise<UnidadMedida[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Error al cargar unidades de medida");
    return res.json();
};

export const getUnidadMedidaById = async (id: string): Promise<UnidadMedida> => {
    const res = await fetch(`${BASE_URL}/${id}/`);
    if (!res.ok) throw new Error("Error al cargar la unidad de medida");
    return res.json();
};

export const deleteUnidadMedida = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}/`, { method: 'DELETE' });
    return res.ok;
};

export const saveUnidadMedida = async (datos: UnidadMedidaPayload, id?: string): Promise<boolean> => {
    const url = id ? `${BASE_URL}/${id}` : `${BASE_URL}/`;
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};
