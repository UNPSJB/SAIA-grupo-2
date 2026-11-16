import { API_URL } from '../constants/config';
import { mensajeDeError } from '../utils/errores';
import type {
    ConfiguracionVistaPublica,
    ConfiguracionVistaPublicaPayload,
    VistaPublicaResumen,
} from '../types/vistaPublica';

const BASE_URL = `${API_URL}/vista-publica`;

export const getConfiguracionVistaPublica = async (): Promise<ConfiguracionVistaPublica> => {
    const res = await fetch(`${BASE_URL}/configuracion`);
    if (!res.ok) throw new Error("Error al obtener la configuración de vista pública");
    return res.json();
};

export const getConfiguracionesVistaPublica = async (): Promise<ConfiguracionVistaPublica[]> => {
    const res = await fetch(`${BASE_URL}/configuraciones`);
    if (!res.ok) throw new Error("Error al listar las configuraciones de vista pública");
    return res.json();
};

export const createConfiguracionVistaPublica = async (nombre: string): Promise<ConfiguracionVistaPublica> => {
    const res = await fetch(`${BASE_URL}/configuraciones`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre }),
    });
    if (!res.ok) throw new Error("Error al crear la vista pública");
    return res.json();
};

export const updateConfiguracionVistaPublica = async (payload: ConfiguracionVistaPublicaPayload): Promise<ConfiguracionVistaPublica> => {
    const res = await fetch(`${BASE_URL}/configuracion`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al actualizar la configuración de vista pública'));
    return res.json();
};

export const updateConfiguracionVistaPublicaById = async (id: number, payload: ConfiguracionVistaPublicaPayload): Promise<ConfiguracionVistaPublica> => {
    const res = await fetch(`${BASE_URL}/configuraciones/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al actualizar la vista pública'));
    return res.json();
};

export const deleteConfiguracionVistaPublicaById = async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/configuraciones/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error("Error al eliminar la vista pública");
};

export const getVistaPublicaByToken = async (token: string): Promise<VistaPublicaResumen> => {
    const res = await fetch(`${BASE_URL}/publico/${token}`);
    if (!res.ok) {
        if (res.status === 404) {
            throw new Error("DESACTIVADA");
        }
        throw new Error("Error al consultar la vista pública");
    }
    return res.json();
};
