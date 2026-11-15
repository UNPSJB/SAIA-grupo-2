import type { Sector, SectorPayload } from '../types/sectores';
import { API_URL } from '../constants/config';

const BASE_URL = `${API_URL}/sectores`;

export const getSectores = async (): Promise<Sector[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Error al cargar sectores");
    return res.json();
};

export const getSectorById = async (id: number): Promise<Sector> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Error al cargar el sector");
    return res.json();
};

export const deleteSector = async (id: number): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    return res.ok;
};

export const saveSector = async (datos: SectorPayload, id?: number): Promise<boolean> => {
    const url = id ? `${BASE_URL}/${id}` : `${BASE_URL}/`;
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};