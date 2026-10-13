import type {
    AlertaVencimiento,
    CumplimientoEmpleado,
    Documentacion,
    DocumentacionPayload,
    DocumentacionUpdatePayload,
    RequisitoDocumentacion,
    TipoDocumentacion,
} from '../types/documentacion';

const BASE_URL = 'http://127.0.0.1:8000/documentacion';

export const getDocumentacion = async (
    empleadoId?: number,
    tipo?: TipoDocumentacion
): Promise<Documentacion[]> => {
    const parametros = new URLSearchParams();
    if (empleadoId !== undefined) parametros.append('empleado_id', String(empleadoId));
    if (tipo !== undefined) parametros.append('tipo', tipo);

    const consulta = parametros.toString();
    const res = await fetch(consulta ? `${BASE_URL}/?${consulta}` : `${BASE_URL}/`);

    if (!res.ok) throw new Error('Error al cargar la documentación');
    return res.json();
};

export const getDocumentacionById = async (id: string): Promise<Documentacion> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error('Error al cargar el documento');
    return res.json();
};

// export const getAlertasDocumentacion = async (
//     tipo?: TipoDocumentacion
// ): Promise<AlertaVencimiento[]> => {
//     const url = tipo ? `${BASE_URL}/alertas?tipo=${tipo}` : `${BASE_URL}/alertas`;
//     const res = await fetch(url);
//     if (!res.ok) throw new Error('Error al cargar las alertas de documentación');
//     return res.json();
// };

export const getAlertasDocumentacion = async (
    tipo?: TipoDocumentacion,
    empleadoId?: number,
    fechaDesde?: string,
    fechaHasta?: string
): Promise<AlertaVencimiento[]> => {
    const parametros = new URLSearchParams();

    if (tipo !== undefined) parametros.append('tipo', tipo);
    if (empleadoId !== undefined) parametros.append('empleado_id', String(empleadoId));
    if (fechaDesde !== undefined && fechaDesde !== '') {
        parametros.append('fecha_desde', fechaDesde);
    }
    if (fechaHasta !== undefined && fechaHasta !== '') {
        parametros.append('fecha_hasta', fechaHasta);
    }

    const consulta = parametros.toString();
    const url = consulta
        ? `${BASE_URL}/alertas?${consulta}`
        : `${BASE_URL}/alertas`;

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error('Error al cargar las alertas de documentación');
    }

    return res.json();
};

export const getRequisitos = async (): Promise<RequisitoDocumentacion[]> => {
    const res = await fetch(`${BASE_URL}/requisitos`);
    if (!res.ok) throw new Error('Error al cargar los requisitos');
    return res.json();
};

export const getCumplimiento = async (
    empleadoId: number
): Promise<CumplimientoEmpleado> => {
    const res = await fetch(`${BASE_URL}/cumplimiento/${empleadoId}`);
    if (!res.ok) throw new Error('Error al cargar el cumplimiento documental');
    return res.json();
};

export const getCumplimientoGeneral = async (
    soloIncompletos = false
): Promise<CumplimientoEmpleado[]> => {
    const url = soloIncompletos
        ? `${BASE_URL}/cumplimiento?solo_incompletos=true`
        : `${BASE_URL}/cumplimiento`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar el cumplimiento documental');
    return res.json();
};

export const createDocumentacion = async (
    datos: DocumentacionPayload
): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};

export const updateDocumentacion = async (
    id: string,
    datos: DocumentacionUpdatePayload
): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};

export const deleteDocumentacion = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    return res.ok;
};
