import { API_URL } from '../constants/config';
import type { ConfiguracionVistaPublica } from '../types/vistaPublica';

const BASE_URL = `${API_URL}/vista-publica/configuracion`;

export const getConfiguracionVistaPublica = async (): Promise<ConfiguracionVistaPublica> => {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Error al obtener la configuración de vista pública");
    return res.json();
};

export const updateConfiguracionVistaPublica = async (activa: boolean): Promise<ConfiguracionVistaPublica> => {
    const res = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activa }),
    });
    if (!res.ok) throw new Error("Error al actualizar la configuración de vista pública");
    return res.json();
};
