import { API_URL } from '../constants/config';
import type { ConfiguracionEmpresa } from '../types/configuracionEmpresa';

const BASE_URL = `${API_URL}/configuracion-empresa`;

export const getConfiguracionEmpresa = async (): Promise<ConfiguracionEmpresa> => {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Error al obtener los datos de la empresa");
    return res.json();
};

export const updateConfiguracionEmpresa = async (payload: {
    nombre_empresa?: string;
    cuit?: string;
    domicilio?: string;
    telefono?: string;
    email?: string;
    logo_base64?: string | null;
}): Promise<ConfiguracionEmpresa> => {
    const res = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error al actualizar los datos de la empresa");
    return res.json();
};
