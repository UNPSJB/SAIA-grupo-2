import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import BuscadorTexto from '../../components/BuscadorTexto';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import { getProductos } from '../../services/productosServices';
import {
    getRecetas,
    getVersionVigenteReceta,
    RecetasApiError,
} from '../../services/recetasServices';
import type { Producto } from '../../types/productos';
import type { Receta, VersionReceta } from '../../types/receta';
import { filtrarPorTexto } from '../../utils/texto';
import styles from '../../styles/shared.module.css';
import HistorialVersionesRecetaModal from './HistorialVersionesRecetaModal';

interface ProductoConEstadoReceta {
    producto: Producto;
    receta: Receta | null;
    version: VersionReceta | null;
}

interface RespuestaRecetas {
    datos: ProductoConEstadoReceta[];
    cargando: boolean;
    error: string | null;
}

function formatearGramos(valor: number): string {
    return `${new Intl.NumberFormat('es-AR', {
        maximumFractionDigits: 2,
    }).format(valor)} g`;
}

export default function RecetaList() {
    const { usuario } = useAuth();
    const [respuesta, setRespuesta] = useState<RespuestaRecetas>({
        datos: [],
        cargando: true,
        error: null,
    });
    const [busqueda, setBusqueda] = useState('');
    const [recetaHistorial, setRecetaHistorial] = useState<{ id: number; nombre: string } | null>(null);

    useEffect(() => {
        let cancelado = false;

        const cargarRecetas = async () => {
            try {
                const [productos, recetas] = await Promise.all([
                    getProductos(),
                    getRecetas(),
                ]);

                const recetasPorProducto = new Map<number, Receta>(
                    recetas.map((r) => [r.producto_id, r]),
                );

                const datos = await Promise.all(
                    productos.map(async (producto): Promise<ProductoConEstadoReceta> => {
                        const receta = recetasPorProducto.get(producto.id) ?? null;
                        let version: VersionReceta | null = null;

                        if (receta) {
                            try {
                                version = await getVersionVigenteReceta(receta.id);
                            } catch (problema) {
                                if (
                                    problema instanceof RecetasApiError
                                    && problema.status !== 404
                                ) {
                                    throw problema;
                                }
                            }
                        }

                        return { producto, receta, version };
                    }),
                );

                if (!cancelado) {
                    setRespuesta({ datos, cargando: false, error: null });
                }
            } catch (problema) {
                console.error('Error al cargar las recetas:', problema);
                if (!cancelado) {
                    setRespuesta({
                        datos: [],
                        cargando: false,
                        error: problema instanceof Error
                            ? problema.message
                            : 'No se pudieron cargar los productos y recetas.',
                    });
                }
            }
        };

        void cargarRecetas();

        return () => {
            cancelado = true;
        };
    }, []);

    const filtradas = filtrarPorTexto(respuesta.datos, busqueda, (item) => [
        item.producto.nombre,
        item.producto.tipo,
        item.producto.unidad_medida.nombre,
        item.version ? `v${item.version.version}` : 'Sin receta',
    ]);

    const columnas: Columna<ProductoConEstadoReceta>[] = [
        {
            key: 'producto',
            encabezado: 'Producto',
            ordenable: true,
            variant: 'titulo',
            valorOrdenamiento: ({ producto }) => producto.nombre,
            render: ({ producto }) => (
                <span style={{ fontWeight: 600 }}>{producto.nombre}</span>
            ),
        },
        {
            key: 'tipo',
            encabezado: 'Tipo',
            ordenable: true,
            valorOrdenamiento: ({ producto }) => producto.tipo,
            render: ({ producto }) => producto.tipo === 'alimento' ? 'Alimento' : 'Bebida',
        },
        {
            key: 'version',
            encabezado: 'Versión vigente',
            ordenable: true,
            valorOrdenamiento: ({ version }) => version?.version ?? 0,
            render: ({ version }) => (
                version ? (
                    <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                        v{version.version}
                    </span>
                ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Sin receta
                    </span>
                )
            ),
        },
        {
            key: 'rendimiento',
            encabezado: 'Rendimiento final',
            ordenable: true,
            valorOrdenamiento: ({ version }) => version?.rendimiento_final_gramos ?? 0,
            render: ({ version }) => version
                ? formatearGramos(version.rendimiento_final_gramos)
                : '—',
        },
        {
            key: 'unidad_venta',
            encabezado: 'Unidad de venta',
            ordenable: true,
            valorOrdenamiento: ({ version }) => version?.unidad_venta_gramos ?? 0,
            render: ({ version }) => version
                ? formatearGramos(version.unidad_venta_gramos)
                : '—',
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: ({ producto, receta }) => (
                <div className={styles.grupoBotonesTabla}>
                    {receta ? (
                        <>
                            {usuario?.rol === 'admin' && (
                                <Link
                                    to={`/recetas/${receta.id}/nueva-version`}
                                    title="Crear nueva versión de receta"
                                >
                                    <Boton
                                        variant="guardar"
                                        title="Crear nueva versión de receta"
                                    />
                                </Link>
                            )}
                            <Link to={`/recetas/${receta.id}`} title="Ver detalle de la receta">
                                <Boton variant="ver" style={{ padding: '8px 12px' }} />
                            </Link>
                            <Boton
                                variant="documentos"
                                onClick={() => setRecetaHistorial({ id: receta.id, nombre: producto.nombre })}
                                title="Ver historial de versiones"
                            />
                        </>
                    ) : (
                        usuario?.rol === 'admin' && (
                            <Link to={`/recetas/nueva?producto_id=${producto.id}`} title="Crear receta">
                                <Boton variant="crear" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                                    Crear receta
                                </Boton>
                            </Link>
                        )
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Recetas"
                descripcion="Listado de productos y la versión vigente de su receta."
                acciones={usuario?.rol === 'admin' && (
                    <Link to="/recetas/nueva">
                        <Boton variant="crear">Nueva receta</Boton>
                    </Link>
                )}
            />

            <div className={styles.filaBotonesSuperiores}>
                <BuscadorTexto
                    valor={busqueda}
                    onCambio={setBusqueda}
                    placeholder="Buscar producto o receta..."
                />
            </div>

            {respuesta.error && (
                <p className={styles.textDanger} role="alert">
                    {respuesta.error}
                </p>
            )}

            <TablaPaginada
                datos={filtradas}
                columnas={columnas}
                gridTemplateColumns="2fr 1fr 1.2fr 1.4fr 1.2fr 1.2fr"
                itemsPorPagina={10}
                mensajeVacio={
                    respuesta.cargando
                        ? 'Cargando recetas…'
                        : busqueda
                          ? 'No hay productos o recetas que coincidan con la búsqueda.'
                          : 'Todavía no hay productos ni recetas registradas.'
                }
                columnaOrdenInicial="producto"
            />

            {recetaHistorial && (
                <HistorialVersionesRecetaModal
                    recetaId={recetaHistorial.id}
                    recetaNombre={recetaHistorial.nombre}
                    onClose={() => setRecetaHistorial(null)}
                />
            )}
        </div>
    );
}
