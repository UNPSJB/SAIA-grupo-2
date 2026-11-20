import { API_URL } from '../constants/config';
import type {
    Aditivo,
    AditivoPayload,
    ClaseFuncionalAditivo,
    ClaseFuncionalAditivoPayload,
} from '../types/aditivos';
import { mensajeDeError } from '../utils/errores';

const BASE_URL_ADITIVOS = `${API_URL}/aditivos`;
const BASE_URL_CLASES_FUNCIONALES = `${API_URL}/clases-funcionales`;

type RolUsuario = 'admin' | 'operario';

export const getAditivos = async (): Promise<Aditivo[]> => {
    const res = await fetch(`${BASE_URL_ADITIVOS}/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudieron cargar los aditivos.'));
    return res.json();
};

export const getAditivoById = async (id: number | string): Promise<Aditivo> => {
    const res = await fetch(`${BASE_URL_ADITIVOS}/${id}`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo cargar el aditivo.'));
    return res.json();
};

export const getAditivosDeClaseFuncional = async (
    claseFuncionalId: number | string,
): Promise<Aditivo[]> => {
    const res = await fetch(`${BASE_URL_CLASES_FUNCIONALES}/${claseFuncionalId}/aditivos`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudieron cargar los aditivos de la clase funcional.'));
    return res.json();
};

export const crearAditivo = async (
    payload: AditivoPayload,
    rol: RolUsuario,
): Promise<Aditivo> => {
    const res = await fetch(`${BASE_URL_ADITIVOS}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': rol,
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo crear el aditivo.'));
    return res.json();
};

export const getClasesFuncionalesAditivos = async (): Promise<ClaseFuncionalAditivo[]> => {
    const res = await fetch(`${BASE_URL_CLASES_FUNCIONALES}/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudieron cargar las clases funcionales.'));
    return res.json();
};

export const getClaseFuncionalAditivoById = async (
    id: number | string,
): Promise<ClaseFuncionalAditivo> => {
    const res = await fetch(`${BASE_URL_CLASES_FUNCIONALES}/${id}`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo cargar la clase funcional.'));
    return res.json();
};

export const crearClaseFuncionalAditivo = async (
    payload: ClaseFuncionalAditivoPayload,
    rol: RolUsuario,
): Promise<ClaseFuncionalAditivo> => {
    const res = await fetch(`${BASE_URL_CLASES_FUNCIONALES}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': rol,
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo crear la clase funcional.'));
    return res.json();
};

export const actualizarClaseFuncionalAditivo = async (
    id: number | string,
    payload: ClaseFuncionalAditivoPayload,
    rol: RolUsuario,
): Promise<ClaseFuncionalAditivo> => {
    const res = await fetch(`${BASE_URL_CLASES_FUNCIONALES}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': rol,
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo actualizar la clase funcional.'));
    return res.json();
};
