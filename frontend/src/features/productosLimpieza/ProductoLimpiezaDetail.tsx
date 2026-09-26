import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { ProductoLimpieza } from '../../types/productosLimpieza';

import { getProductoLimpiezaById } from '../../services/productosLimpiezaServices';

function ProductoLimpiezaDetail() {
    const { id } = useParams();

    const [producto, setProducto] = useState<ProductoLimpieza | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cargarProducto = async () => {
            if (!id) return;

            try {
                const data = await getProductoLimpiezaById(id);
                setProducto(data);
            } catch (err) {
                setError('No se pudo cargar el producto de limpieza.');
            }
        };

        cargarProducto();
    }, [id]);

    if (error) {
        return <p>{error}</p>;
    }

    if (!producto) {
        return <p>Cargando...</p>;
    }

    return (
        <div>
            <h1>Detalle del producto de limpieza</h1>

            <p>
                <strong>ID:</strong> {producto.id}
            </p>

            <p>
                <strong>Nombre:</strong> {producto.nombre}
            </p>

            <p>
                <strong>Tipo:</strong> {producto.tipo}
            </p>

            <p>
                <strong>Stock:</strong> {producto.stock}
            </p>

            <p>
                <strong>Unidad de medida:</strong>{' '}
                {producto.unidad_medida.nombre}
            </p>

            <Link to="/productosLimpieza">
                Volver a productos de limpieza
            </Link>
        </div>
    );
}

export default ProductoLimpiezaDetail;