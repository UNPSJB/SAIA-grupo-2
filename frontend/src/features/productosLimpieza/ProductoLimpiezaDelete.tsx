import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ProductoLimpieza } from '../../types/productosLimpieza';

import {
    deleteProductoLimpieza,
    getProductoLimpiezaById,
} from '../../services/productosLimpiezaServices';

import Boton from '../../components/Boton';
import ModalConfirmacion from '../../components/confirmacion';
import styles from '../../styles/shared.module.css';

function ProductoLimpiezaDelete() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [producto, setProducto] =
        useState<ProductoLimpieza | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [modalAbierto, setModalAbierto] = useState(true);
    const [eliminando, setEliminando] = useState(false);

    useEffect(() => {
        const cargarProducto = async () => {
            if (!id) return;

            try {
                const data = await getProductoLimpiezaById(id);
                setProducto(data);
            } catch (err) {
                setError(
                    'No se pudo cargar el producto de limpieza.'
                );
                setModalAbierto(false);
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
                throw new Error(
                    'No se pudo eliminar el producto.'
                );
            }

            navigate('/productosLimpieza');
        } catch (err) {
            setError(
                'No se pudo eliminar el producto. Puede que esté asociado a una tarea.'
            );
            setModalAbierto(false);
        } finally {
            setEliminando(false);
        }
    };

    if (error) {
        return (
            <div className={styles.contenedorPrincipal}>
                <p>{error}</p>

                <Boton
                    variant="volver"
                    onClick={() =>
                        navigate('/productosLimpieza')
                    }
                >
                    Volver
                </Boton>
            </div>
        );
    }

    if (!producto) {
        return (
            <div className={styles.contenedorPrincipal}>
                <p>Cargando...</p>
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Eliminar Producto de Limpieza</h2>

            <div
                className={styles.tarjetaEstatica}
                style={{
                    width: '100%',
                    maxWidth: '600px',
                }}
            >
                <div className={styles.tarjetaHeader}>
                    <h3>{producto.nombre}</h3>
                </div>

                <div className={styles.tarjetaBody}>
                    <p>
                        <strong>Tipo:</strong>{' '}
                        {producto.tipo}
                    </p>

                    <p>
                        <strong>Stock:</strong>{' '}
                        {producto.stock}
                    </p>

                    <p>
                        <strong>Unidad de medida:</strong>{' '}
                        {producto.unidad_medida.nombre}
                    </p>
                </div>

                <div className={styles.filaBotones}>
                    <Boton
                        variant="volver"
                        onClick={() =>
                            navigate('/productosLimpieza')
                        }
                    >
                        Volver
                    </Boton>
                </div>
            </div>

            <ModalConfirmacion
                isOpen={modalAbierto && !eliminando}
                titulo="Eliminar producto de limpieza"
                mensaje={`¿Está seguro de que desea eliminar "${producto.nombre}"?`}
                onConfirm={handleDelete}
                onCancel={() =>
                    navigate('/productosLimpieza')
                }
            />
        </div>
    );
}

export default ProductoLimpiezaDelete;