import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import BuscadorTexto from '../../components/BuscadorTexto';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import {
    getRecetas,
    getVersionVigenteReceta,
    RecetasApiError,
} from '../../services/recetasServices';
import type { Receta, VersionReceta } from '../../types/receta';
import { filtrarPorTexto } from '../../utils/texto';
import styles from '../../styles/shared.module.css';

interface RecetaConVersion {
    receta: Receta;
    version: VersionReceta | null;
}

interface RespuestaRecetas {
    datos: RecetaConVersion[];
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

    useEffect(() => {
        let cancelado = false;

        const cargarRecetas = async () => {
            try {
                const recetas = await getRecetas();
                const datos = await Promise.all(
                    recetas.map(async (receta): Promise<RecetaConVersion> => {
                        try {
                            const version = await getVersionVigenteReceta(receta.id);
                            return { receta, version };
                        } catch (problema) {
                            if (problema instanceof RecetasApiError && problema.status === 404) {
                                return { receta, version: null };
                            }
                            throw problema;
                        }
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
                            : 'No se pudieron cargar las recetas.',
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
        item.receta.producto.nombre,
        item.receta.producto.tipo,
        item.receta.producto.unidad_medida.nombre,
        item.version?.version,
        item.version?.estado,
    ]);

    const columnas: Columna<RecetaConVersion>[] = [
        {
            key: 'producto',
            encabezado: 'Producto',
            ordenable: true,
            variant: 'titulo',
            valorOrdenamiento: ({ receta }) => receta.producto.nombre,
            render: ({ receta }) => receta.producto.nombre,
        },
        {
            key: 'tipo',
            encabezado: 'Tipo',
            ordenable: true,
            valorOrdenamiento: ({ receta }) => receta.producto.tipo,
            render: ({ receta }) => receta.producto.tipo === 'alimento' ? 'Alimento' : 'Bebida',
        },
        {
            key: 'version',
            encabezado: 'Versión vigente',
            ordenable: true,
            valorOrdenamiento: ({ version }) => version?.version ?? 0,
            render: ({ version }) => version ? `v${version.version}` : 'Sin versión vigente',
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
            render: ({ receta }) => (
                <div className={styles.grupoBotonesTabla}>
                    <Link to={`/recetas/${receta.id}`} title="Ver detalle">
                        <Boton variant="ver" style={{ padding: '8px 12px' }} />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Recetas"
                descripcion="Listado de recetas y su versión vigente."
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
                    placeholder="Buscar receta..."
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
                gridTemplateColumns="2fr 1fr 1.2fr 1.4fr 1.2fr 1fr"
                itemsPorPagina={10}
                mensajeVacio={
                    respuesta.cargando
                        ? 'Cargando recetas…'
                        : busqueda
                          ? 'No hay recetas que coincidan con la búsqueda.'
                          : 'Todavía no hay recetas registradas.'
                }
                columnaOrdenInicial="producto"
            />
        </div>
    );
}
