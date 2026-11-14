import { API_URL } from '../constants/config';
import type {
    AlimentoReferencia,
    DatoNutricionalEntrada,
    DatosNutricionalesInsumo,
    ResumenNutricionalInsumo,
} from '../types/datosNutricionales';
import { mensajeDeError } from '../utils/errores';

export const getResumenNutricional = async (): Promise<ResumenNutricionalInsumo[]> => {
    const res = await fetch(`${API_URL}/datos-nutricionales/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar los datos nutricionales'));
    return res.json();
};

export const getDatosNutricionales = async (insumoId: number | string): Promise<DatosNutricionalesInsumo> => {
    const res = await fetch(`${API_URL}/insumos/${insumoId}/datos-nutricionales`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar los datos nutricionales del insumo'));
    return res.json();
};

export const guardarDatosNutricionales = async (
    insumoId: number | string,
    empleadoId: number,
    datos: DatoNutricionalEntrada[],
): Promise<DatosNutricionalesInsumo> => {
    const res = await fetch(`${API_URL}/insumos/${insumoId}/datos-nutricionales`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId, datos }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudieron guardar los datos nutricionales'));
    return res.json();
};

export const buscarAlimentosReferencia = async (busqueda: string): Promise<AlimentoReferencia[]> => {
    const parametros = new URLSearchParams({ busqueda, limite: '20' });
    const res = await fetch(`${API_URL}/alimentos-referencia/?${parametros.toString()}`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al buscar en la base de referencia'));
    return res.json();
};
