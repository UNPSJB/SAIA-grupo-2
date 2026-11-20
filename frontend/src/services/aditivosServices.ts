import { API_URL } from '../constants/config';
import type { Aditivo, ClaseFuncionalAditivo } from '../types/aditivos';
import { mensajeDeError } from '../utils/errores';

const HEADERS_ADMIN = {
    'Content-Type': 'application/json',
    'X-User-Role': 'admin',
};

export const getClasesFuncionales = async (): Promise<ClaseFuncionalAditivo[]> => {
    const res = await fetch(`${API_URL}/clases-funcionales/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al obtener clases funcionales'));
    return res.json();
};

export const createClaseFuncional = async (nombre: string, necesita_ins: boolean): Promise<ClaseFuncionalAditivo> => {
    const res = await fetch(`${API_URL}/clases-funcionales/`, {
        method: 'POST',
        headers: HEADERS_ADMIN,
        body: JSON.stringify({ nombre, necesita_ins }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al crear la clase funcional'));
    return res.json();
};

export const getAditivos = async (): Promise<Aditivo[]> => {
    const res = await fetch(`${API_URL}/aditivos/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al obtener aditivos'));
    return res.json();
};

export const createAditivo = async (payload: {
    nombre_completo: string;
    clase_funcional_id: number;
    numero_ins?: string | null;
}): Promise<Aditivo> => {
    const res = await fetch(`${API_URL}/aditivos/`, {
        method: 'POST',
        headers: HEADERS_ADMIN,
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al crear el aditivo'));
    return res.json();
};
