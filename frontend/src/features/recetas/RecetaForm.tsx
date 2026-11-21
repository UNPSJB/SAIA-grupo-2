import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { getProductos } from '../../services/productosServices';
import { getRecetas } from '../../services/recetasServices';
import type { Producto } from '../../types/productos';
import styles from '../../styles/shared.module.css';

interface ErroresFormulario {
    producto?: string;
}

export default function RecetaForm() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';

    const [productos, setProductos] = useState<Producto[]>([]);
    const [productoId, setProductoId] = useState('');
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [errores, setErrores] = useState<ErroresFormulario>({});

    useEffect(() => {
        let cancelado = false;

        const cargarCatalogos = async () => {
            try {
                const [productosData, recetasData] = await Promise.all([
                    getProductos(),
                    getRecetas(),
                ]);

                if (cancelado) return;
                const productosConReceta = new Set(
                    recetasData.map((receta) => receta.producto_id),
                );
                setProductos(
                    productosData.filter((producto) => !productosConReceta.has(producto.id)),
                );
                setErrorCarga(null);
            } catch (problema) {
                console.error('Error al cargar los datos del formulario de receta:', problema);
                if (!cancelado) {
                    setErrorCarga(
                        problema instanceof Error
                            ? problema.message
                            : 'No se pudieron cargar los datos del formulario.',
                    );
                }
            } finally {
                if (!cancelado) setCargando(false);
            }
        };

        void cargarCatalogos();
        return () => {
            cancelado = true;
        };
    }, []);

    if (!esAdmin) return <Navigate to="/recetas" replace />;

    const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
        evento.preventDefault();
        setErrores(productoId ? {} : {
            producto: 'Seleccioná el producto al que pertenece la receta.',
        });
    };

    const estiloError = {
        borderColor: 'var(--rojo-texto)',
        outline: 'none',
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Crear receta"
                descripcion="Seleccioná el producto al que pertenece la receta."
                ancho="900px"
            />

            {errorCarga && (
                <p className={styles.textDanger} role="alert">
                    {errorCarga}
                </p>
            )}

            {cargando ? (
                <p className={styles.textMuted}>Cargando productos…</p>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className={styles.formularioTarjeta}
                    style={{ maxWidth: '900px' }}
                    noValidate
                >
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                            <label className={styles.modalTituloCampo} htmlFor="receta-producto">
                                Producto:
                            </label>
                            <select
                                id="receta-producto"
                                value={productoId}
                                onChange={(evento) => {
                                    setProductoId(evento.target.value);
                                    if (errores.producto) {
                                        setErrores({});
                                    }
                                }}
                                style={errores.producto ? estiloError : {}}
                                aria-invalid={Boolean(errores.producto)}
                            >
                                <option value="">Seleccioná un producto</option>
                                {productos.map((producto) => (
                                    <option key={producto.id} value={String(producto.id)}>
                                        {producto.nombre}
                                    </option>
                                ))}
                            </select>
                            {errores.producto && (
                                <span
                                    style={{
                                        color: 'var(--rojo-texto)',
                                        fontSize: '0.8rem',
                                        marginTop: '5px',
                                    }}
                                >
                                    {errores.producto}
                                </span>
                            )}
                            {productos.length === 0 && (
                                <span className={styles.textMuted}>
                                    Todos los productos ya tienen una receta o todavía no hay productos registrados.
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={styles.bloqueDetalle}>
                        <Boton
                            variant="crear"
                            type="button"
                            disabled={cargando || Boolean(errorCarga) || !productoId}
                        >
                            Crear version inicial
                        </Boton>
                    </div>

                    <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                        <Link to="/recetas">
                            <Boton variant="volver">Cancelar</Boton>
                        </Link>
                    </div>
                </form>
            )}
        </div>
    );
}
