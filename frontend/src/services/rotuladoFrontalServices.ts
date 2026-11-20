import { API_URL } from '../constants/config';
import type {
    CambioMarcaInsumo,
    EstadoRotuladoProducto,
    EvaluacionRotulado,
    MarcaInsumo,
    PropuestaMarcas,
    RespuestasAplicabilidad,
} from '../types/rotuladoFrontal';
import { mensajeDeError } from '../utils/errores';

const BASE_URL = `${API_URL}/rotulado-frontal`;

export const getResumenRotulado = async (): Promise<EstadoRotuladoProducto[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar el rotulado frontal de los productos'));
    return res.json();
};

export const getRotuladoProducto = async (productoId: number | string): Promise<EstadoRotuladoProducto> => {
    const res = await fetch(`${BASE_URL}/productos/${productoId}`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar el rotulado frontal del producto'));
    return res.json();
};

export const getHistorialRotulado = async (productoId: number | string): Promise<EvaluacionRotulado[]> => {
    const res = await fetch(`${BASE_URL}/productos/${productoId}/historial`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar el historial de evaluaciones'));
    return res.json();
};

export const evaluarRotulado = async (
    productoId: number | string,
    empleadoId: number,
    respuestas: RespuestasAplicabilidad,
): Promise<EvaluacionRotulado> => {
    const res = await fetch(`${BASE_URL}/productos/${productoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId, ...respuestas }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo guardar la evaluación'));
    return res.json();
};

export const getPropuestaMarcas = async (productoId: number | string): Promise<PropuestaMarcas> => {
    const res = await fetch(`${BASE_URL}/productos/${productoId}/propuesta`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al consultar la receta del producto'));
    return res.json();
};

export const getMarcasInsumos = async (): Promise<MarcaInsumo[]> => {
    const res = await fetch(`${BASE_URL}/insumos`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar las marcas de los insumos'));
    return res.json();
};

export const actualizarMarcasInsumos = async (
    empleadoId: number,
    marcas: CambioMarcaInsumo[],
): Promise<MarcaInsumo[]> => {
    const res = await fetch(`${BASE_URL}/insumos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId, marcas }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudieron guardar las marcas'));
    return res.json();
};
