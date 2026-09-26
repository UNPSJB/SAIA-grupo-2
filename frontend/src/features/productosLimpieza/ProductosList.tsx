import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { ProductoLimpieza } from '../../types/productosLimpieza';
import { getProductos } from '../../services/productosLimpiezaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function ProductosList() {
    const [productos, setProductos] = useState<ProductoLimpieza[]>([]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getProductos();
                setProductos(data);
            } catch (error) {
                console.error("Error al cargar productos:", error);
            }
        };
        cargarDatos();
    }, []);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gestión de Productos de Limpieza</h2>
            
            <Link to="/productos_limpieza/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">Nuevo Producto</Boton>
            </Link>

            <div className={styles.contenedorTabla}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr' }}>
                    <div>Nombre</div>
                    <div>Tipo</div>
                    <div>Stock Actual</div>
                    <div>Acciones</div>
                </div>

                {productos.map((producto) => (
                    <div key={producto.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr' }}>
                        <div style={{ fontWeight: '500' }}>{producto.nombre}</div>
                        <div style={{ textTransform: 'capitalize' }}>{producto.tipo}</div>
                        <div style={{ color: producto.stock <= 0 ? '#dc2626' : 'inherit', fontWeight: producto.stock <= 0 ? 'bold' : 'normal' }}>
                            {producto.stock} {producto.unidad_medida?.nombre || ''}
                            {producto.stock <= 0 && " (Sin stock)"}
                        </div>
                        <div className={styles.grupoBotonesTabla}>
                            <Link to={`/productos_limpieza/editar/${producto.id}`}>
                                <Boton variant="editar"></Boton>
                            </Link>
                            <Link to={`/productos_limpieza/eliminar/${producto.id}`}>
                                <Boton variant="eliminar"></Boton>
                            </Link>
                        </div>
                    </div>
                ))}

                {productos.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center' }}>No hay productos registrados.</div>
                )}
            </div>
        </div>
    );
}