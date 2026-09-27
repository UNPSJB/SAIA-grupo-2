import type { ProductoLimpieza, ProductoLimpiezaPayload } from '../types/productosLimpieza';

const BASE_URL = 'http://127.0.0.1:8000/productos_limpieza';

export const getProductos = async (conStock: boolean = false): Promise<ProductoLimpieza[]> => {
    const url = conStock ? `${BASE_URL}/?con_stock=true` : `${BASE_URL}/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error al cargar los productos");
    return res.json();
};

export const getProductoById = async (id: string): Promise<ProductoLimpieza> => {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Error al cargar el producto");
    return res.json();
};

export const saveProducto = async (datos: ProductoLimpiezaPayload, id?: string): Promise<boolean> => {
    const url = id ? `${BASE_URL}/${id}` : `${BASE_URL}/`;
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};

export const deleteProducto = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    return res.ok;
};