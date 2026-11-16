import type { UnidadMedida } from '../types/unidadesMedida';
import { API_URL } from '../constants/config';

const BASE_URL = `${API_URL}/unidades_medida`;

export const getUnidadesMedida = async (): Promise<UnidadMedida[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Error al cargar unidades de medida");
    return res.json();
};
