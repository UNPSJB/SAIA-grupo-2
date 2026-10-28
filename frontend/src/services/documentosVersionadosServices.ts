import type {
    DocumentoVersionado,
    DocumentoVersionadoCreate,
    VersionDocumento,
    VersionDocumentoCreate,
} from '../types/documentosVersionados';
const BASE_URL_DOCUMENTOS_VERSIONADOS = 'http://127.0.0.1:8000/documentos-versionados';
const BASE_URL_DOCUMENTOS = 'http://127.0.0.1:8000/documentos';
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
    payload: DocumentoVersionadoCreate
): Promise<DocumentoVersionado> => {
    const res = await fetch(`${BASE_URL_DOCUMENTOS_VERSIONADOS}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...obtenerCabecerasUsuario(),
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al crear documento versionado');
    return res.json();
};

/**
 * Sube una nueva versión para un documento existente.
 */
export const subirNuevaVersionDocumento = async (
    payload: VersionDocumentoCreate
): Promise<VersionDocumento> => {
    const res = await fetch(`${BASE_URL_DOCUMENTOS_VERSIONADOS}/subir-version`, {
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