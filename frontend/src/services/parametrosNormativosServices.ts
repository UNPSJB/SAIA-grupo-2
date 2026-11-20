import { API_URL } from '../constants/config';
import type {
    BorradorUpdate,
    ConjuntoDetalle,
    ConjuntoResumen,
    ModuloRotuladoFrontal,
} from '../types/parametrosNormativos';
import { mensajeDeError } from '../utils/errores';

const BASE_URL = `${API_URL}/parametros-normativos`;

export const getConjuntosParametros = async (): Promise<ConjuntoResumen[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar las versiones de parámetros'));
    return res.json();
};

export const getParametrosVigentes = async (): Promise<ConjuntoDetalle> => {
    const res = await fetch(`${BASE_URL}/vigente`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar los parámetros vigentes'));
    return res.json();
};

export const getConjuntoParametros = async (id: number | string): Promise<ConjuntoDetalle> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar la versión de parámetros'));
    return res.json();
};

export const crearBorradorParametros = async (empleadoId: number, baseId?: number): Promise<ConjuntoDetalle> => {
    const res = await fetch(`${BASE_URL}/borradores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId, base_id: baseId ?? null }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo crear la nueva versión'));
    return res.json();
};

export const modificarBorradorParametros = async (
    id: number | string,
    cambios: BorradorUpdate,
): Promise<ConjuntoDetalle> => {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudieron guardar los cambios'));
    return res.json();
};

export const publicarParametros = async (id: number | string, empleadoId: number): Promise<ConjuntoDetalle> => {
    const res = await fetch(`${BASE_URL}/${id}/publicar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleado_id: empleadoId }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo publicar la versión'));
    return res.json();
};

export const descartarBorradorParametros = async (id: number | string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo descartar el borrador'));
};

export const getModuloRotuladoFrontal = async (): Promise<ModuloRotuladoFrontal> => {
    const res = await fetch(`${BASE_URL}/modulo-rotulado-frontal`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al consultar el módulo de rotulado frontal'));
    return res.json();
};

export const cambiarModuloRotuladoFrontal = async (
    activo: boolean,
    empleadoId: number,
): Promise<ModuloRotuladoFrontal> => {
    const res = await fetch(`${BASE_URL}/modulo-rotulado-frontal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo, empleado_id: empleadoId }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo cambiar el estado del módulo'));
    return res.json();
};

export interface ClaseFuncionalAditivo {
    id: number;
    nombre: string;
}

export const getClasesFuncionalesAditivo = async (): Promise<ClaseFuncionalAditivo[]> => {
    const res = await fetch(`${API_URL}/clases-funcionales/`);
    if (!res.ok) throw new Error(await mensajeDeError(res, 'Error al cargar las clases funcionales de aditivos'));
    return res.json();
};
