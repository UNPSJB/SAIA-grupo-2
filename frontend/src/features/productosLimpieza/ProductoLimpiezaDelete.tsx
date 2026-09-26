import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ProductoLimpieza } from '../../types/productosLimpieza';

import {
    deleteProductoLimpieza,
    getProductoLimpiezaById,
} from '../../services/productosLimpiezaServices';

function ProductoLimpiezaDelete() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [producto, setProducto] = useState<ProductoLimpieza | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [eliminando, setEliminando] = useState(false);

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

    const handleDelete = async () => {
        if (!id) return;

        try {
            setEliminando(true);
            setError(null);

            const ok = await deleteProductoLimpieza(id);

            if (!ok) {
                throw new Error('No se pudo eliminar el producto.');
            }

            navigate('/productosLimpieza');
        } catch (err) {
            setError(
                'No se pudo eliminar el producto. Puede que esté asociado a una tarea.'
            );
        } finally {
            setEliminando(false);
        }
    };

    if (error && !producto) {
        return <p>{error}</p>;
    }

    if (!producto) {
        return <p>Cargando...</p>;
    }

    return (
        <div>
            <h1>Eliminar producto de limpieza</h1>

            <p>
                ¿Está seguro de que desea eliminar el producto?
            </p>

            <p>
                <strong>{producto.nombre}</strong>
            </p>

            {error && <p>{error}</p>}

            <button
                type="button"
                onClick={handleDelete}
                disabled={eliminando}
            >
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
            </button>

            <button
                type="button"
                onClick={() => navigate('/productosLimpieza')}
            >
                Cancelar
            </button>
        </div>
    );
}

export default ProductoLimpiezaDelete;