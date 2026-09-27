import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { ProductoLimpieza } from '../../types/productosLimpieza';
import { getProductoLimpiezaById } from '../../services/productosLimpiezaServices';

import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function ProductoLimpiezaDetail() {
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
                console.error('Error al cargar el producto de limpieza:', err);
                setError('No se pudo cargar el producto de limpieza.');
            }
        };

        cargarProducto();
    }, [id]);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Producto de Limpieza</h2>

            {producto ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%' }}>
                    <p><strong>Nombre:</strong> {producto.nombre}</p>

                    <p>
                        <strong>Tipo:</strong>{' '}
                        <span
                            className={styles.badge}
                            style={{ fontSize: '0.75rem', padding: '3px 10px', textTransform: 'capitalize' }}
                        >
                            {producto.tipo}
                        </span>
                    </p>

                    <p>
                        <strong>Stock:</strong>{' '}
                        {producto.stock > 0 ? (
                            `${producto.stock} ${producto.unidad_medida.nombre}`
                        ) : (
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Sin stock</span>
                        )}
                    </p>

                    <p><strong>Unidad de medida:</strong> {producto.unidad_medida.nombre}</p>

                    <div className={styles.bloqueDetalle} style={{ textAlign: 'center', marginTop: '20px' }}>
                        <Link to="/productosLimpieza">
                            <Boton variant="volver">Volver a la lista</Boton>
                        </Link>
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
