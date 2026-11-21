import { API_URL } from '../constants/config';
import type {
    ComposicionReceta,
    Receta,
    RecetaPayload,
    VersionReceta,
    VersionRecetaPayload,
} from '../types/receta';
import { mensajeDeError } from '../utils/errores';

const BASE_URL = `${API_URL}/recetas`;

export class RecetasApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'RecetasApiError';
        this.status = status;
    }
}

type RolUsuario = 'admin' | 'operario';

async function solicitar<T>(
    ruta: string,
    mensajePorDefecto: string,
    init?: RequestInit,
): Promise<T> {
    const res = await fetch(`${BASE_URL}${ruta}`, init);
    if (!res.ok) {
        throw new RecetasApiError(await mensajeDeError(res, mensajePorDefecto), res.status);
    }
    return res.json();
}

function headersEscritura(rol: RolUsuario): HeadersInit {
    return {
        'Content-Type': 'application/json',
        'X-User-Role': rol,
    };
}

export const getRecetas = async (): Promise<Receta[]> =>
    solicitar('/', 'No se pudieron cargar las recetas.');

export const getRecetaById = async (id: number | string): Promise<Receta> =>
    solicitar(`/${id}`, 'No se pudo cargar la receta.');

export const getVersionVigenteReceta = async (
    recetaId: number | string,
): Promise<VersionReceta> =>
    solicitar(`/${recetaId}/versiones/vigente`, 'No se pudo cargar la versión vigente.');

export const getVersionesReceta = async (
    recetaId: number | string,
): Promise<VersionReceta[]> =>
    solicitar(`/${recetaId}/versiones`, 'No se pudo cargar el historial de versiones.');

export const getVersionReceta = async (
    recetaId: number | string,
    numeroVersion: number | string,
): Promise<VersionReceta> =>
    solicitar(`/${recetaId}/versiones/${numeroVersion}`, 'No se pudo cargar la versión de la receta.');

export const crearReceta = async (
    payload: RecetaPayload,
    rol: RolUsuario,
): Promise<Receta> =>
    solicitar('/', 'No se pudo crear la receta.', {
        method: 'POST',
        headers: headersEscritura(rol),
        body: JSON.stringify(payload),
    });

export const crearVersionReceta = async (
    recetaId: number | string,
    payload: VersionRecetaPayload,
    rol: RolUsuario,
): Promise<VersionReceta> =>
    solicitar(`/${recetaId}/versiones`, 'No se pudo crear la nueva versión.', {
        method: 'POST',
        headers: headersEscritura(rol),
        body: JSON.stringify(payload),
    });

export const marcarVersionRecetaVigente = async (
    recetaId: number | string,
    numeroVersion: number | string,
    rol: RolUsuario,
): Promise<VersionReceta> =>
    solicitar(
        `/${recetaId}/versiones/${numeroVersion}/vigencia`,
        'No se pudo cambiar la versión vigente.',
        {
            method: 'PUT',
            headers: headersEscritura(rol),
        },
    );

export const getComposicionReceta = async (
    recetaId: number | string,
    numeroVersion: number | string,
): Promise<ComposicionReceta> =>
    solicitar(
        `/${recetaId}/versiones/${numeroVersion}/composicion`,
        'No se pudo calcular la composición porcentual.',
        {
            headers: {
                'X-User-Role': 'admin',
            },
        },
    );