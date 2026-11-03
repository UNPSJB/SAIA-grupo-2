import type { GraficoCumplimientoResumen, GranularidadCumplimiento } from '../types/tablero';

const BASE_URL = 'http://127.0.0.1:8000/checklists';

export const getGraficoCumplimiento = async (
    fechaDesde: string,
    fechaHasta: string,
    granularidad: GranularidadCumplimiento,
): Promise<GraficoCumplimientoResumen> => {
    const parametros = new URLSearchParams({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        granularidad,
    });
    const res = await fetch(`${BASE_URL}/cumplimiento?${parametros}`);
    if (!res.ok) throw new Error('Error al cargar los datos de cumplimiento');
    return res.json();
};
