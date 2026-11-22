import { API_URL } from '../constants/config';
import type {
    CambioMarcaAlergenos,
    DatosConservacion,
    DatosDeclaracion,
    DetalleAlergenosProducto,
    MarcaAlergenosInsumo,
    ResumenAlergenosProducto,
} from '../types/alergenos';
import { mensajeDeError } from '../utils/errores';

const BASE_URL = `${API_URL}/alergenos`;

export const getResumenAlergenos = async (): Promise<ResumenAlergenosProducto[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar los alérgenos de los productos'));
    return res.json();
};

export const getAlergenosProducto = async (productoId: number | string): Promise<DetalleAlergenosProducto> => {
    const res = await fetch(`${BASE_URL}/productos/${productoId}`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar los alérgenos del producto'));
    return res.json();
};

export const guardarDeclaracionAlergenos = async (
    productoId: number | string,
    empleadoId: number,
    datos: DatosDeclaracion,
): Promise<DetalleAlergenosProducto> => {
    const res = await fetch(`${BASE_URL}/productos/${productoId}/declaracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId, ...datos }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo guardar la declaración'));
    return res.json();
};

export const guardarConservacion = async (
    productoId: number | string,
    empleadoId: number,
    datos: DatosConservacion,
): Promise<DetalleAlergenosProducto> => {
    const res = await fetch(`${BASE_URL}/productos/${productoId}/conservacion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId, ...datos }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudieron guardar las condiciones de conservación'));
    return res.json();
};

export const getMarcasAlergenos = async (): Promise<MarcaAlergenosInsumo[]> => {
    const res = await fetch(`${BASE_URL}/insumos`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar las marcas de alérgenos'));
    return res.json();
};

export const actualizarMarcasAlergenos = async (
    empleadoId: number,
    marcas: CambioMarcaAlergenos[],
): Promise<MarcaAlergenosInsumo[]> => {
    const res = await fetch(`${BASE_URL}/insumos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId, marcas }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudieron guardar las marcas'));
    return res.json();
};
