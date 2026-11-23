import { API_URL } from '../constants/config';
import type {
    ComposicionReceta,
    ConfiguracionProduccion,
    FormatoDeclaracionAditivos,
    ListaIngredientesRotulo,
    Receta,
    RecetaPayload,
    VersionReceta,
    VersionRecetaPayload,
} from '../types/receta';
import type { EscaladoRecetaPayload, RecetaEscalada } from '../types/recetas';
import { mensajeDeError } from '../utils/errores';

const BASE_URL = `${API_URL}/recetas`;

export const escalarRecetaProducto = async (
    productoId: number,
    payload: EscaladoRecetaPayload,
): Promise<RecetaEscalada> => {
    const res = await fetch(`${BASE_URL}/producto/${productoId}/escalar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, 'No se pudo calcular el escalado de la receta'));
    return res.json();
};

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
    motivoCambio: string,
): Promise<VersionReceta> =>
    solicitar(
        `/${recetaId}/versiones/${numeroVersion}/vigencia?motivo_cambio=${encodeURIComponent(motivoCambio.trim())}`,
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

export const getConfiguracionProduccion = async (): Promise<ConfiguracionProduccion> =>
    solicitar('/configuracion-produccion', 'No se pudo cargar la configuración de producción.');

export const updateConfiguracionProduccion = async (
    formato: FormatoDeclaracionAditivos,
    rol: RolUsuario,
): Promise<ConfiguracionProduccion> =>
    solicitar('/configuracion-produccion', 'No se pudo actualizar el formato de declaración de aditivos.', {
        method: 'PUT',
        headers: headersEscritura(rol),
        body: JSON.stringify({ formato_declaracion_aditivos: formato}),
    });

export const getListaIngredientesRotulo = async (
    recetaId: number | string,
    numeroVersion: number | string,
): Promise<ListaIngredientesRotulo> =>
    solicitar(
        `/${recetaId}/versiones/${numeroVersion}/lista-ingredientes`,
        'No se pudo obtener la lista de ingredientes para el rótulo.',
    );

export const guardarOrdenManualIngredientes = async (
    recetaId: number | string,
    numeroVersion: number | string,
    ordenInsumoIds: number[],
    empleadoId: number | null,
    rol: RolUsuario,
): Promise<ListaIngredientesRotulo> =>
    solicitar(
        `/${recetaId}/versiones/${numeroVersion}/lista-ingredientes/orden-manual`,
        'No se pudo guardar el orden manual.',
        {
            method: 'PUT',
            headers: headersEscritura(rol),
            body: JSON.stringify({
                orden_insumo_ids: ordenInsumoIds,
                empleado_id: empleadoId,
            }),
        },
    );

export const restablecerOrdenAutomaticoIngredientes = async (
    recetaId: number | string,
    numeroVersion: number | string,
    rol: RolUsuario,
): Promise<ListaIngredientesRotulo> =>
    solicitar(
        `/${recetaId}/versiones/${numeroVersion}/lista-ingredientes/orden-manual`,
        'No se pudo restablecer el orden automático.',
        {
            method: 'DELETE',
            headers: headersEscritura(rol),
        },
    );