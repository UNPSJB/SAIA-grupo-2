import type { Equipo, EquipoPayload } from '../types/equipos';

const BASE_URL = 'http://127.0.0.1:8000/equipos';

export const getEquipos = async (): Promise<Equipo[]> => {
    const res = await fetch(`${BASE_URL}`);
    if (!res.ok) throw new Error("Error al cargar equipos");
    return res.json();
};

export const getEquipoById = async (id: string): Promise<Equipo> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Error al cargar el equipo");
    return res.json();
};

export const deleteEquipo = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    return res.ok;
};

export const saveEquipo = async (datos: EquipoPayload, id?: string): Promise<boolean> => {
    const url = id ? `${BASE_URL}/${id}` : `${BASE_URL}/`;
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};
