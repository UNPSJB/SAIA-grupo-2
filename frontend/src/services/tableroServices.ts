
import type {
    EstadisticasProduccion,
    GraficoCumplimientoResumen,
    GranularidadCumplimiento,
} from '../types/tablero';
import { API_URL } from '../constants/config';

const BASE_URL = `${API_URL}/checklists`;
const PRODUCTOS_URL = `${API_URL}/productos`;

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

export const getEstadisticasProduccion = async (
    fechaDesde: string,
    fechaHasta: string,
    rol: string,
): Promise<EstadisticasProduccion> => {
    const parametros = new URLSearchParams({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
    });

    const res = await fetch(
        `${PRODUCTOS_URL}/estadisticas?${parametros}`,
        {
            headers: {
                'X-User-Role': rol,
            },
        },
    );

    if (!res.ok) {
        throw new Error('Error al cargar las estadísticas de producción');
    }

    return res.json();
};
