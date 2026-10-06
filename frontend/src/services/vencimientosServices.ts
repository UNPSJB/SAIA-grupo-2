import type {
    CategoriaVencimiento,
    EstadoVencimiento,
    ResumenVencimientos,
} from '../types/vencimientos';

const BASE_URL = 'http://127.0.0.1:8000/vencimientos';

export const getVencimientosConsolidados = async (
    categoria?: CategoriaVencimiento | '',
    estado?: EstadoVencimiento | ''
): Promise<ResumenVencimientos> => {
    const params = new URLSearchParams();
    if (categoria) params.append('categoria', categoria);
    if (estado) params.append('estado', estado);

    const query = params.toString();
    const url = query ? `${BASE_URL}/?${query}` : `${BASE_URL}/`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener la lista consolidada de vencimientos');
    return res.json();
};
