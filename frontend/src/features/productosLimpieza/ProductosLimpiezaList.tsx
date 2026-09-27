import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { ProductoLimpieza } from '../../types/productosLimpieza';
import { getProductosLimpieza } from '../../services/productosLimpiezaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

function ProductosLimpiezaList() {
    const [productos, setProductos] = useState<ProductoLimpieza[]>([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const [error, setError] = useState<string | null>(null);

    const productosPorPagina = 10;

    useEffect(() => {
        const cargarProductos = async () => {
            try {
                const data = await getProductosLimpieza();
                setProductos(data);
            } catch (err) {
                console.error('Error al cargar productos de limpieza:', err);
                setError('No se pudieron cargar los productos de limpieza.');
            }
        };

        cargarProductos();
    }, []);

    const indiceUltimo = paginaActual * productosPorPagina;
    const indicePrimero = indiceUltimo - productosPorPagina;

    const productosActuales = productos.slice(
        indicePrimero,
        indiceUltimo
    );

    const totalPaginas = Math.ceil(
        productos.length / productosPorPagina
    );

    if (error) {
        return (
            <div className={styles.contenedorPrincipal}>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Productos de Limpieza</h2>

            <Link
                to="/productosLimpieza/nuevo"
                className={styles.linkCrear}
            >
                <Boton variant="crear">
                    Registrar Producto
                </Boton>
            </Link>

            <div
                className={styles.contenedorTabla}
                style={{ maxWidth: '1100px' }}
            >
                <div
                    className={styles.filaHeader}
                    style={{
                        gridTemplateColumns:
                            '2fr 1.5fr 1fr 1.5fr 1.5fr',
                    }}
                >
                    <div>Nombre</div>
                    <div>Tipo</div>
                    <div>Stock</div>
                    <div>Unidad de Medida</div>
                    <div>Acciones</div>
                </div>

                {productosActuales.map((producto) => (
                    <div
                        key={producto.id}
                        className={styles.filaItem}
                        style={{
                            gridTemplateColumns:
                                '2fr 1.5fr 1fr 1.5fr 1.5fr',
                        }}
                    >
                        <div
                            style={{
                                fontWeight: '500',
                                color: 'var(--text-h)',
                            }}
                        >
                            {producto.nombre}
                        </div>

                        <div>
                            <span
                                className={styles.badge}
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '3px 10px',
                                }}
                            >
                                {producto.tipo}
                            </span>
                        </div>

                        <div>
                            {producto.stock}
                        </div>

                        <div>
                            <span
                                className={styles.badge}
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '3px 10px',
                                }}
                            >
                                {producto.unidad_medida.nombre}
                            </span>
                        </div>

                        <div className={styles.grupoBotonesTabla}>
                            <Link
                                to={`/productosLimpieza/editar/${producto.id}`}
                                title="Editar producto"
                            >
                                <Boton
                                    variant="editar"
                                    style={{
                                        padding: '8px 12px',
                                    }}
                                />
                            </Link>

                            <Link
                                to={`/productosLimpieza/${producto.id}`}
                                title="Ver detalle"
                            >
                                <Boton
                                    variant="ver"
                                    style={{
                                        padding: '8px 12px',
                                    }}
                                />
                            </Link>

                            <Link
                                to={`/productosLimpieza/eliminar/${producto.id}`}
                                title="Eliminar producto"
                            >
                                <Boton
                                    variant="eliminar"
                                    style={{
                                        padding: '8px 12px',
                                    }}
                                />
                            </Link>
                        </div>
                    </div>
                ))}

                {productosActuales.length === 0 && (
                    <div
                        style={{
                            padding: '30px',
                            textAlign: 'center',
                            color: 'var(--text)',
                        }}
                    >
                        No hay productos de limpieza registrados.
                    </div>
                )}
            </div>

            {totalPaginas > 1 && (
                <div
                    className={styles.filaBotones}
                    style={{
                        alignItems: 'center',
                        marginTop: '30px',
                        justifyContent: 'center',
                    }}
                >
                    <Boton
                        variant="volver"
                        onClick={() =>
                            setPaginaActual((p) => p - 1)
                        }
                        disabled={paginaActual === 1}
                    >
                        Anterior
                    </Boton>

                    <span
                        style={{
                            color: 'var(--text-h)',
                            fontWeight: 'bold',
                            margin: '0 15px',
                        }}
                    >
                        Página {paginaActual} de {totalPaginas}
                    </span>

                    <Boton
                        variant="siguiente"
                        onClick={() =>
                            setPaginaActual((p) => p + 1)
                        }
                        disabled={
                            paginaActual === totalPaginas
                        }
                    >
                        Siguiente
                    </Boton>
                </div>
            )}
        </div>
    );
}

export default ProductosLimpiezaList;