import type {
    ProductoLimpieza,
    ProductoLimpiezaPayload,
} from '../types/productosLimpieza';

const BASE_URL = 'http://127.0.0.1:8000/productos_limpieza';

export const getProductosLimpieza = async (): Promise<ProductoLimpieza[]> => {
    const res = await fetch(`${BASE_URL}/`);

    if (!res.ok) {
        throw new Error('Error al cargar productos de limpieza');
    }

    return res.json();
};

export const getProductoLimpiezaById = async (
    id: string
): Promise<ProductoLimpieza> => {
    const res = await fetch(`${BASE_URL}/${id}`);

    if (!res.ok) {
        throw new Error('Error al cargar el producto de limpieza');
    }

    return res.json();
};

export const deleteProductoLimpieza = async (
    id: string
): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
    });

    return res.ok;
};

export const saveProductoLimpieza = async (
    datos: ProductoLimpiezaPayload,
    id?: string
): Promise<boolean> => {
    const url = id
        ? `${BASE_URL}/${id}`
        : `${BASE_URL}/`;

    const metodo = id ? 'PUT' : 'POST';

    console.log('4 - FETCH', metodo, url, datos);

    const res = await fetch(url, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
    });

    console.log('5 - STATUS', res.status);

    return res.ok;
};