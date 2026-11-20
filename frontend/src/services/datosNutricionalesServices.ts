import { API_URL } from '../constants/config';
import type {
    AlimentoReferencia,
    DatoNutricionalEntrada,
    DatosNutricionalesInsumo,
    ResumenNutricionalInsumo,
    InformacionNutricionalProducto,
    ValorDiarioReferencia,
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

export const getInformacionNutricionalProducto = async (
    productoId: number | string,
): Promise<InformacionNutricionalProducto> => {
    const res = await fetch(`${API_URL}/productos/${productoId}/informacion-nutricional`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar la tabla nutricional del producto'));
    return res.json();
};

export const getValoresDiariosReferencia = async (): Promise<ValorDiarioReferencia[]> => {
    const res = await fetch(`${API_URL}/datos-nutricionales/valores-diarios`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar los valores diarios de referencia'));
    return res.json();
};

export const updateValorDiarioReferencia = async (
    nutriente: string,
    payload: {
        valor_diario?: number | null;
        unidad?: string;
        umbral_no_significativo?: number;
        decimales?: number;
    }
): Promise<ValorDiarioReferencia> => {
    const res = await fetch(`${API_URL}/datos-nutricionales/valores-diarios/${nutriente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al actualizar el valor diario de referencia'));
    return res.json();
};
