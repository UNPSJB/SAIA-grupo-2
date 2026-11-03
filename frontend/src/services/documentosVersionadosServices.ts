import type {
    DocumentoVersionado,
    DocumentoVersionadoPayload,
    VersionDocumento,
    VersionDocumentoPayload,
} from '../types/documentosVersionados';
const BASE_URL_DOCUMENTOS_VERSIONADOS = 'http://127.0.0.1:8000/documentos-versionados';
const BASE_URL_DOCUMENTOS = 'http://127.0.0.1:8000/documentos';

function describirDetalleError(detalle: unknown): string | null {
    if (typeof detalle === 'string' && detalle.trim()) return detalle;
    if (!Array.isArray(detalle)) return null;

    const mensajes = detalle.flatMap((item: unknown) => {
        if (typeof item === 'string') return [item];
        if (typeof item !== 'object' || item === null) return [];

        const error = item as { loc?: unknown; msg?: unknown };
        if (typeof error.msg !== 'string') return [];
        const ubicacion = Array.isArray(error.loc)
            ? error.loc.filter((parte): parte is string | number =>
                typeof parte === 'string' || typeof parte === 'number'
            ).join('.')
            : '';
        return [ubicacion ? `${ubicacion}: ${error.msg}` : error.msg];
    });

    return mensajes.length > 0 ? mensajes.join('; ') : null;
}

async function mensajeErrorRespuesta(res: Response, mensajePorDefecto: string): Promise<string> {
    const texto = await res.text();
    if (!texto.trim()) return `${mensajePorDefecto} (HTTP ${res.status})`;

    try {
        const cuerpo: unknown = JSON.parse(texto);
        if (typeof cuerpo === 'object' && cuerpo !== null) {
            const respuesta = cuerpo as { detail?: unknown; message?: unknown };
            const detalle = describirDetalleError(respuesta.detail);
            if (detalle) return detalle;
            if (typeof respuesta.message === 'string' && respuesta.message.trim()) {
                return respuesta.message;
            }
        }
    } catch {
        return texto;
    }

    return texto;
}

/**
 * Obtiene las cabeceras de usuario desde localStorage para autenticación basada en rol en el backend.
 */
function obtenerCabecerasUsuario(): Record<string, string> {
    try {
        const raw = localStorage.getItem('saia_user');
        if (!raw) return {};
        const usuario = JSON.parse(raw);
        const headers: Record<string, string> = {};
        if (usuario.rol) headers['X-User-Role'] = usuario.rol;
        if (usuario.legajo) headers['X-User-Legajo'] = String(usuario.legajo);
        if (usuario.id) headers['X-User-Id'] = String(usuario.id);
        return headers;
    } catch {
        return {};
    }
}
/**
 * Lista todos los documentos versionados disponibles.
 */
export const getDocumentosVersionados = async (): Promise<DocumentoVersionado[]> => {
    const res = await fetch(`${BASE_URL_DOCUMENTOS_VERSIONADOS}/`);
    if (!res.ok) throw new Error('Error al cargar documentos versionados');
    return res.json();
};

/**
 * Obtiene un documento versionado por su ID junto a su versión vigente.
 */
export const getDocumentoVersionadoById = async (id: number | string): Promise<DocumentoVersionado> => {
    const res = await fetch(`${BASE_URL_DOCUMENTOS_VERSIONADOS}/${id}`);
    if (!res.ok) throw new Error('Error al cargar el documento versionado');
    return res.json();
};
/**
 * HISTORIA DE USUARIO: Consultar historial de versiones.
 * Consulta el listado completo de versiones asociadas a un documento ordenadas de forma descendente.
 * Requiere rol 'admin' según los criterios de aceptación y tareas técnicas.
 */
export const getHistorialVersiones = async (documentoId: number | string): Promise<VersionDocumento[]> => {
    const headers = obtenerCabecerasUsuario();
    const res = await fetch(`${BASE_URL_DOCUMENTOS}/${documentoId}/versiones`, {
        headers,
    });
    if (!res.ok) {
        if (res.status === 403) {
            throw new Error('Acceso denegado: Se requiere rol de administrador para consultar el historial de versiones.');
        }
        if (res.status === 404) {
            throw new Error('Documento no encontrado.');
        }
        throw new Error('Error al cargar el historial de versiones.');
    }
    return res.json();
};

/**
 * Crea un nuevo documento versionado con su versión inicial (v1 activa).
 */
export const crearDocumentoVersionado = async (
    payload: DocumentoVersionadoPayload
): Promise<DocumentoVersionado> => {
    const res = await fetch(`${BASE_URL_DOCUMENTOS_VERSIONADOS}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...obtenerCabecerasUsuario(),
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error(await mensajeErrorRespuesta(res, 'No se pudo crear el documento versionado'));
    }
    return res.json();
};

/**
 * Sube una nueva versión para un documento existente.
 */
export const subirNuevaVersionDocumento = async (
    payload: VersionDocumentoPayload
): Promise<VersionDocumento> => {
    const res = await fetch(`${BASE_URL_DOCUMENTOS_VERSIONADOS}/${payload.documentos_versionados_id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...obtenerCabecerasUsuario(),
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al subir nueva versión del documento');
    return res.json();
};


export const marcarVersionVigente = async (
    documentoId: number | string,
    versionId: number | string
): Promise<VersionDocumento> => {
    const res = await fetch(`${BASE_URL_DOCUMENTOS}/${documentoId}/versiones/${versionId}/vigencia`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...obtenerCabecerasUsuario(),
        },
    });
    if (!res.ok) {
        if (res.status === 403) {
            throw new Error('Acceso denegado: Se requiere rol de administrador.');
        }
        throw new Error('Error al establecer la versión como vigente.');
    }
    return res.json();
};


export const getDocumentosVigentes = async (): Promise<DocumentoVersionado[]> => {
    const res = await fetch(`${BASE_URL_DOCUMENTOS}/vigentes`, {
        headers: obtenerCabecerasUsuario(),
    });
    if (!res.ok) {
        if (res.status === 403) {
            throw new Error('No tienes permisos para consultar los documentos vigentes.');
        }
        throw new Error('Error al cargar los documentos vigentes.');
    }
    return res.json();
};