import type {
    CierrePayload,
    EstadoIncidente,
    Incidente,
    FotoIncidentePayload,
    IncidentePayload,
    ReaperturaPayload,
    ResumenIncidentes,
    TipoIncidente,
} from '../types/incidentes';

const BASE_URL = 'http://127.0.0.1:8000/incidentes';

export const getIncidentes = async (
    estado?: EstadoIncidente,
    tipo?: TipoIncidente
): Promise<Incidente[]> => {
    const parametros = new URLSearchParams();
    if (estado !== undefined) parametros.append('estado', estado);
    if (tipo !== undefined) parametros.append('tipo', tipo);

    const consulta = parametros.toString();
    const res = await fetch(consulta ? `${BASE_URL}/?${consulta}` : `${BASE_URL}/`);

    if (!res.ok) throw new Error('Error al cargar los incidentes');
    return res.json();
};

export const getIncidentesAbiertos = async (): Promise<Incidente[]> => {
    const res = await fetch(`${BASE_URL}/abiertos`);
    if (!res.ok) throw new Error('Error al cargar los incidentes abiertos');
    return res.json();
};

export const getIncidenteById = async (id: string | number): Promise<Incidente> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error('Error al cargar el incidente');
    return res.json();
};

export const createIncidente = async (
    datos: IncidentePayload
): Promise<Incidente | null> => {
    const res = await fetch(`${BASE_URL}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    if (!res.ok) return null;
    return res.json();
};

export const adjuntarFoto = async (
    id: string | number,
    datos: FotoIncidentePayload
): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}/foto`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};

export const cerrarIncidente = async (
    id: string | number,
    datos: CierrePayload
): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}/cierre`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};

export const reabrirIncidente = async (
    id: string | number,
    datos: ReaperturaPayload
): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}/reapertura`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};

export const getResumenIncidentes = async (): Promise<ResumenIncidentes> => {
    const res = await fetch(`${BASE_URL}/resumen`);

    if (!res.ok) {throw new Error('Error al cargar el resumen de incidentes');}

    return res.json();
};

export interface EstadisticaIncidente {
    tipo: TipoIncidente;
    cantidad: number;
};

export const getEstadisticasIncidentes = async (
    fechaDesde: string,
    fechaHasta: string
): Promise<EstadisticaIncidente[]> => {
    const parametros = new URLSearchParams({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
    });

    const res = await fetch(`${BASE_URL}/estadisticas?${parametros}`);

    if (!res.ok) {
        throw new Error('Error al cargar las estadísticas de incidentes');
    }

    return res.json();
};
