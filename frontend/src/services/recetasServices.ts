import { API_URL } from "../constants/config";
import type { EscaladoRecetaPayload, RecetaEscalada } from "../types/recetas";
import { mensajeDeError } from "../utils/errores";

const BASE_URL = `${API_URL}/recetas`;

export const escalarRecetaProducto = async (
    productoId: number,
    payload: EscaladoRecetaPayload,
): Promise<RecetaEscalada> => {
    const res = await fetch(`${BASE_URL}/producto/${productoId}/escalar`,{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo calcular el escalado de la receta'))
        return res.json();
};