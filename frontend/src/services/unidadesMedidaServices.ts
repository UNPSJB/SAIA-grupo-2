import type { UnidadMedida } from '../types/unidadesMedida';

const BASE_URL = 'http://127.0.0.1:8000/unidades_medida';

export const getUnidadesMedida = async (): Promise<UnidadMedida[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Error al cargar unidades de medida");
    return res.json();
};
