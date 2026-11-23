import { API_URL } from '../constants/config';
import { mensajeDeError } from '../utils/errores';
import type {
    CompletitudRotulo,
    HistorialCambioRotulo,
    Rotulo,
    RotuloActualizar,
    RotuloCrear,
    RotuloLote,
    RotuloLoteActualizar,
    RotuloLoteCrear,
    ExportacionRotulo,
    ExportacionRotuloDetalle,
} from '../types/rotulos';

const BASE_URL = `${API_URL}/rotulos`;

function headersAdmin(empleadoId: number): HeadersInit {
    return {
        'Content-Type': 'application/json',
        'X-User-Id': String(empleadoId),
    };
}

async function manejarRespuesta<T>(
    res: Response,
    mensaje: string,
): Promise<T> {
    if (!res.ok) {
        throw new Error(await mensajeDeError(res, mensaje));
    }

    return res.json();
}

export const getRotulos = async (): Promise<Rotulo[]> => {
    const res = await fetch(`${BASE_URL}/`);
    return manejarRespuesta(res, 'Error al cargar los rótulos');
};

export const getRotuloById = async (
    id: number | string,
): Promise<Rotulo> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    return manejarRespuesta(res, 'Error al cargar el rótulo');
};

export const getRotuloProducto = async (
    productoId: number | string,
): Promise<Rotulo | null> => {
    const res = await fetch(`${BASE_URL}/producto/${productoId}`);
    return manejarRespuesta(res, 'Error al cargar el rótulo del producto');
};

export const crearRotulo = async (
    datos: RotuloCrear,
    empleadoId: number,
): Promise<Rotulo> => {
    const res = await fetch(`${BASE_URL}/`, {
        method: 'POST',
        headers: headersAdmin(empleadoId),
        body: JSON.stringify(datos),
    });

    return manejarRespuesta(res, 'No se pudo crear el rótulo');
};

export const actualizarRotulo = async (
    id: number | string,
    datos: RotuloActualizar,
    empleadoId: number,
): Promise<Rotulo> => {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: headersAdmin(empleadoId),
        body: JSON.stringify(datos),
    });

    return manejarRespuesta(res, 'No se pudo actualizar el rótulo');
};

export const actualizarSnapshots = async (
    id: number | string,
    empleadoId: number,
): Promise<Rotulo> => {
    const res = await fetch(`${BASE_URL}/${id}/actualizar-snapshots`, {
        method: 'POST',
        headers: headersAdmin(empleadoId),
    });

    return manejarRespuesta(res, 'No se pudieron actualizar los datos del rótulo');
};

export const getCompletitudRotulo = async (
    id: number | string,
): Promise<CompletitudRotulo> => {
    const res = await fetch(`${BASE_URL}/${id}/completitud`);
    return manejarRespuesta(res, 'No se pudo calcular la completitud del rótulo');
};

export const crearLoteRotulo = async (
    id: number | string,
    datos: RotuloLoteCrear,
    empleadoId: number,
): Promise<RotuloLote> => {
    const res = await fetch(`${BASE_URL}/${id}/lotes`, {
        method: 'POST',
        headers: headersAdmin(empleadoId),
        body: JSON.stringify(datos),
    });

    return manejarRespuesta(res, 'No se pudo asociar el lote al rótulo');
};

export const getLotesRotulo = async (
    id: number | string,
): Promise<RotuloLote[]> => {
    const res = await fetch(`${BASE_URL}/${id}/lotes`);
    return manejarRespuesta(res, 'No se pudieron cargar los lotes del rótulo');
};

export const actualizarLoteRotulo = async (
    loteId: number | string,
    datos: RotuloLoteActualizar,
    empleadoId: number,
): Promise<RotuloLote> => {
    const res = await fetch(`${BASE_URL}/lotes/${loteId}`, {
        method: 'PATCH',
        headers: headersAdmin(empleadoId),
        body: JSON.stringify(datos),
    });

    return manejarRespuesta(res, 'No se pudo actualizar el lote');
};

export const getHistorialRotulo = async (
    id: number | string,
): Promise<HistorialCambioRotulo[]> => {
    const res = await fetch(`${BASE_URL}/${id}/historial`);
    return manejarRespuesta(res, 'No se pudo cargar el historial del rótulo');
};

export const crearExportacionRotulo = async (
    id: number | string,
    empleadoId: number,
): Promise<ExportacionRotulo> => {
    const res = await fetch(`${BASE_URL}/${id}/exportaciones`, {
        method: 'POST',
        headers: headersAdmin(empleadoId),
    });

    return manejarRespuesta(res, 'No se pudo generar la exportación del rótulo');
};

export const getExportacionesRotulo = async (
    id: number | string,
): Promise<ExportacionRotulo[]> => {
    const res = await fetch(`${BASE_URL}/${id}/exportaciones`);

    return manejarRespuesta(res, 'No se pudo cargar el historial de exportaciones');
};

export const getExportacionRotulo = async (
    id: number | string,
    exportacionId: number | string,
): Promise<ExportacionRotuloDetalle> => {
    const res = await fetch(
        `${BASE_URL}/${id}/exportaciones/${exportacionId}`,
    );

    return manejarRespuesta(res, 'No se pudo recuperar la exportación');
};