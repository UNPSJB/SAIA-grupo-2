import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ProductoLimpieza } from '../../types/productosLimpieza';
import { getProductoLimpiezaById } from '../../services/productosLimpiezaServices';

import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

function ProductoLimpiezaDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [producto, setProducto] =
        useState<ProductoLimpieza | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cargarProducto = async () => {
            if (!id) return;

            try {
                const data = await getProductoLimpiezaById(id);
                setProducto(data);
            } catch (err) {
                console.error(
                    'Error al cargar producto:',
                    err
                );
                setError(
                    'No se pudo cargar el producto de limpieza.'
                );
            }
        };

        cargarProducto();
    }, [id]);

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
            <h2>Detalle del Producto de Limpieza</h2>

            <div
                className={styles.tarjetaEstatica}
                style={{
                    width: '100%',
                    maxWidth: '700px',
                }}
            >
                <div className={styles.tarjetaHeader}>
                    <h3>{producto.nombre}</h3>
                </div>

                <div className={styles.tarjetaBody}>
                    <p>
                        <strong>ID:</strong>{' '}
                        {producto.id}
                    </p>

                    <p>
                        <strong>Tipo:</strong>{' '}
                        <span className={styles.badge}>
                            {producto.tipo}
                        </span>
                    </p>

                    <p>
                        <strong>Stock:</strong>{' '}
                        {producto.stock}
                    </p>

                    <p>
                        <strong>Unidad de medida:</strong>{' '}
                        <span className={styles.badge}>
                            {producto.unidad_medida.nombre}
                        </span>
                    </p>
                </div>

                <div className={styles.filaBotones}>
                    <Boton
                        variant="editar"
                        onClick={() =>
                            navigate(
                                `/productosLimpieza/editar/${producto.id}`
                            )
                        }
                    >
                        Editar
                    </Boton>

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
        </div>
    );
}

export default ProductoLimpiezaDetail;