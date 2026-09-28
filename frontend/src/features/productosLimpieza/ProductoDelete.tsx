import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { ProductoLimpieza } from '../../types/productosLimpieza';
import { getProductoById, deleteProducto } from '../../services/productosLimpiezaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function ProductoDelete() {
    const [producto, setProducto] = useState<ProductoLimpieza | null>(null);
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (id) {
            getProductoById(id)
                .then(setProducto)
                .catch(err => console.error("Error al cargar:", err));
        }
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;
        try {
            const exito = await deleteProducto(id);
            if (exito) {
                navigate('/productos_limpieza');
            } else {
                alert('No se puede eliminar el producto. Es probable que esté asociado a una o más tareas.');
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('No se pudo eliminar el producto por un error en el servidor.');
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>¿Desea eliminar este producto?</h2>
            {producto ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%', textAlign: 'center', margin: '0 auto' }}>
                    <h3 style={{ color: 'var(--text-h)' }}>{producto.nombre}</h3>
                    <p><strong>Categoría:</strong> <span style={{ textTransform: 'capitalize' }}>{producto.tipo}</span></p>
                    <p><strong>Stock Actual:</strong> {producto.stock}</p>
                    
                    <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                        <Link to="/productos_limpieza">
                            <Boton variant="volver">Cancelar</Boton>
                        </Link>
                        <Boton variant="eliminar" onClick={handleDelete}>
                            Confirmar Baja
                        </Boton>
                    </div>
                </div>
            ) : (
                <p style={{ textAlign: 'center' }}>Cargando información...</p>
            )}
        </div>
    );
}