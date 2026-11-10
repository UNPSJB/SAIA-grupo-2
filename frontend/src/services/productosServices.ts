import { API_URL } from '../constants/config';
import type { LoteProduccion } from '../types/lotesProduccion';
import type { Producto, ProductoPayload } from '../types/productos';
import { mensajeDeError } from '../utils/errores';

const BASE_URL = `${API_URL}/productos`;

export const getProductos = async (): Promise<Producto[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar los productos'));
    return res.json();
};

export const getProductoById = async (id: number | string): Promise<Producto> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar el producto'));
    return res.json();
};

export const saveProducto = async (datos: ProductoPayload, id?: number | string): Promise<Producto> => {
    const res = await fetch(id ? `${BASE_URL}/${id}` : `${BASE_URL}/`, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo guardar el producto'));
    return res.json();
};

export const getLotesDeProducto = async (id: number | string): Promise<LoteProduccion[]> => {
    const res = await fetch(`${BASE_URL}/${id}/lotes`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar los lotes del producto'));
    return res.json();
};
