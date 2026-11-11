import { API_URL } from '../constants/config';
import type { FiltrosLotes, LoteProduccion, LoteProduccionPayload } from '../types/lotesProduccion';
import { mensajeDeError } from '../utils/errores';

const BASE_URL = `${API_URL}/lotes-produccion`;

export const getLotes = async (filtros: FiltrosLotes = {}): Promise<LoteProduccion[]> => {
    const parametros = new URLSearchParams();
    if (filtros.productoId !== undefined) parametros.append('producto_id', String(filtros.productoId));
    if (filtros.fechaDesde) parametros.append('fecha_desde', filtros.fechaDesde);
    if (filtros.fechaHasta) parametros.append('fecha_hasta', filtros.fechaHasta);

    const consulta = parametros.toString();
    const res = await fetch(consulta ? `${BASE_URL}/?${consulta}` : `${BASE_URL}/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar los lotes'));
    return res.json();
};

export const getLote = async (nroLote: number | string): Promise<LoteProduccion> => {
    const res = await fetch(`${BASE_URL}/${nroLote}`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar el lote'));
    return res.json();
};

export const crearLote = async (datos: LoteProduccionPayload): Promise<LoteProduccion> => {
    const res = await fetch(`${BASE_URL}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo registrar el lote'));
    return res.json();
};
