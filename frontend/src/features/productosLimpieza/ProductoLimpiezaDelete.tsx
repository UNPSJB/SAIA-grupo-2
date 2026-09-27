import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { ProductoLimpieza } from '../../types/productosLimpieza';
import {
    deleteProductoLimpieza,
    getProductoLimpiezaById,
} from '../../services/productosLimpiezaServices';

import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function ProductoLimpiezaDelete() {
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
                console.error('Error al cargar el producto de limpieza:', err);
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

            const exito = await deleteProductoLimpieza(id);

            if (exito) {
                navigate('/productosLimpieza');
            } else {
                setError('No se pudo eliminar el producto. Puede estar asociado a una tarea.');
            }
        } catch (err) {
            console.error('Error de red:', err);
            setError('No se pudo eliminar el producto. Puede estar asociado a una tarea.');
        } finally {
            setEliminando(false);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>¿Desea eliminar este producto de limpieza?</h2>

            {producto ? (
                <div
                    className={styles.tarjetaEstatica}
                    style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}
                >
                    <h3 style={{ color: 'var(--text-h)' }}>{producto.nombre}</h3>

                    <p>
                        <span
                            className={styles.badge}
                            style={{ fontSize: '0.75rem', padding: '3px 10px', textTransform: 'capitalize' }}
                        >
                            {producto.tipo}
                        </span>
                    </p>

                    <p>Stock actual: {producto.stock} {producto.unidad_medida.nombre}</p>

                    {error && (
                        <p style={{ color: '#ef4444', marginTop: '15px' }}>{error}</p>
                    )}

                    <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                        <Link to="/productosLimpieza">
                            <Boton variant="volver">Cancelar</Boton>
                        </Link>
                        <Boton variant="eliminar" onClick={handleDelete} disabled={eliminando}>
                            {eliminando ? 'Eliminando...' : 'Eliminar'}
                        </Boton>
                    </div>
                </div>
            ) : (
                <p style={error ? { color: '#ef4444' } : {}}>
                    {error ?? 'Cargando...'}
                </p>
            )}
        </div>
    );
}
