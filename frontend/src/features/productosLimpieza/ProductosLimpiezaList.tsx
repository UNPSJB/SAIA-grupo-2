import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { ProductoLimpieza } from '../../types/productosLimpieza';
import { getProductosLimpieza } from '../../services/productosLimpiezaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function ProductosLimpiezaList() {
    const [productos, setProductos] = useState<ProductoLimpieza[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const productosPorPagina = 10;

    const cargarProductos = async () => {
        try {
            const data = await getProductosLimpieza();
            setProductos(data);
        } catch (err) {
            console.error('Error al cargar productos de limpieza:', err);
            setError('No se pudieron cargar los productos de limpieza.');
        }
    };

    useEffect(() => {
        cargarProductos();
    }, []);

    const indiceUltimo = paginaActual * productosPorPagina;
    const indicePrimer = indiceUltimo - productosPorPagina;
    const productosActuales = productos.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(productos.length / productosPorPagina);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Productos de Limpieza</h2>

            <Link to="/productosLimpieza/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    Registrar Producto
                </Boton>
            </Link>

            <div className={styles.contenedorTabla} style={{ maxWidth: '1000px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1.3fr 1.4fr 1.5fr' }}>
                    <div>Nombre</div>
                    <div>Tipo</div>
                    <div>Stock</div>
                    <div>Acciones</div>
                </div>

                {productosActuales.map((producto) => (
                    <div key={producto.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1.3fr 1.4fr 1.5fr' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {producto.nombre}
                        </div>

                        <div>
                            <span className={styles.badge} style={{ fontSize: '0.75rem', padding: '3px 10px', textTransform: 'capitalize' }}>
                                {producto.tipo}
                            </span>
                        </div>

                        <div style={{ fontSize: '0.85rem' }}>
                            {producto.stock > 0 ? (
                                `${producto.stock} ${producto.unidad_medida.nombre}`
                            ) : (
                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Sin stock</span>
                            )}
                        </div>

                        <div className={styles.grupoBotonesTabla}>
                            <Link to={`/productosLimpieza/editar/${producto.id}`} title="Editar producto">
                                <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/productosLimpieza/${producto.id}`} title="Ver detalle">
                                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/productosLimpieza/eliminar/${producto.id}`} title="Eliminar registro">
                                <Boton variant="eliminar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                        </div>
                    </div>
                ))}

                {error && (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
                        {error}
                    </div>
                )}

                {!error && productosActuales.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay productos de limpieza registrados.
                    </div>
                )}
            </div>

            {totalPaginas > 1 && (
                <div className={styles.filaBotones} style={{ alignItems: 'center', marginTop: '30px', justifyContent: 'center' }}>
                    <Boton
                        variant="volver"
                        onClick={() => setPaginaActual(p => p - 1)}
                        disabled={paginaActual === 1}
                    >
                        Anterior
                    </Boton>

                    <span style={{ color: 'var(--text-h)', fontWeight: 'bold', margin: '0 15px' }}>
                        Página {paginaActual} de {totalPaginas}
                    </span>

                    <Boton
                        variant="siguiente"
                        onClick={() => setPaginaActual(p => p + 1)}
                        disabled={paginaActual === totalPaginas}
                    >
                        Siguiente
                    </Boton>
                </div>
            )}
        </div>
    );
}
