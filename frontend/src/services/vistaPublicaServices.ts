import { API_URL } from '../constants/config';
import type { ConfiguracionVistaPublica, VistaPublicaResumen } from '../types/vistaPublica';

const BASE_URL = `${API_URL}/vista-publica`;

export const getConfiguracionVistaPublica = async (): Promise<ConfiguracionVistaPublica> => {
    const res = await fetch(`${BASE_URL}/configuracion`);
    if (!res.ok) throw new Error("Error al obtener la configuración de vista pública");
    return res.json();
};

export const updateConfiguracionVistaPublica = async (activa: boolean): Promise<ConfiguracionVistaPublica> => {
    const res = await fetch(`${BASE_URL}/configuracion`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activa }),
    });
    if (!res.ok) throw new Error("Error al actualizar la configuración de vista pública");
    return res.json();
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
