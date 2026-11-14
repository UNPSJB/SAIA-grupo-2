import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { LoteProduccion } from '../../types/lotesProduccion';
import type { Producto } from '../../types/productos';
import { getLotes } from '../../services/lotesProduccionServices';
import { getProductos } from '../../services/productosServices';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import { formatearCantidad, formatearFecha, hoyLocal } from '../productos/formatoProducto';
import LoteDetalleModal from './LoteDetalleModal';
import estilosFiltros from '../../components/Estadisticas.module.css';
import estilos from './LoteDetalleModal.module.css';
import estilosInsumos from './InsumosLote.module.css';
import styles from '../../styles/shared.module.css';

interface Respuesta {
    clave: string;
    lotes: LoteProduccion[];
    error: string | null;
}

function plural(cantidad: number, singular: string, varios: string): string {
    return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

export default function LotesList() {
    const hoy = hoyLocal();
    const [productos, setProductos] = useState<Producto[]>([]);
    const [productoId, setProductoId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [loteSeleccionado, setLoteSeleccionado] = useState<LoteProduccion | null>(null);

    const rangoValido = !fechaDesde || !fechaHasta || fechaDesde <= fechaHasta;
    const clave = `${productoId}|${fechaDesde}|${fechaHasta}`;
    const hayFiltros = Boolean(productoId || fechaDesde || fechaHasta);

    useEffect(() => {
        let cancelado = false;

        getProductos()
            .then((datos) => {
                if (!cancelado) setProductos(datos);
            })
            .catch((problema) => console.error('Error al cargar los productos:', problema));

        return () => {
            cancelado = true;
        };
    }, []);

    useEffect(() => {
        if (!rangoValido) return;
        let cancelado = false;

        getLotes({
            productoId: productoId ? Number(productoId) : undefined,
            fechaDesde: fechaDesde || undefined,
            fechaHasta: fechaHasta || undefined,
        })
            .then((lotes) => {
                if (!cancelado) setRespuesta({ clave, lotes, error: null });
            })
            .catch((problema) => {
                console.error('Error al cargar los lotes:', problema);
                if (!cancelado) {
                    setRespuesta({
                        clave,
                        lotes: [],
                        error: problema instanceof Error ? problema.message : 'No se pudieron cargar los lotes.',
                    });
                }
            });

        return () => {
            cancelado = true;
        };
    }, [clave, productoId, fechaDesde, fechaHasta, rangoValido]);

    const cargando = rangoValido && respuesta?.clave !== clave;
    const lotes = !cargando && rangoValido ? (respuesta?.lotes ?? []) : [];
    const error = !cargando ? respuesta?.error : null;

    const limpiarFiltros = () => {
        setProductoId('');
        setFechaDesde('');
        setFechaHasta('');
    };

    const descripcion = cargando
        ? 'Lotes de producción registrados, del más reciente al más antiguo.'
        : `${plural(lotes.length, 'lote', 'lotes')} ${hayFiltros ? 'con los filtros aplicados' : 'registrados en total'}. El consumo de un lote se puede corregir mientras está abierto; se cierra a mano o al terminar el día, y cerrado es de solo lectura.`;

    const loteActualizado = (actualizado: LoteProduccion) => {
        setRespuesta((actual) =>
            actual && {
                ...actual,
                lotes: actual.lotes.map((lote) => (lote.nro_lote === actualizado.nro_lote ? actualizado : lote)),
            },
        );
    };

    const columnas: Columna<LoteProduccion>[] = [
        {
            key: 'nro_lote',
            encabezado: 'N.º de lote',
            ordenable: true,
            variant: 'titulo',
            render: (lote) => lote.nro_lote,
        },
        {
            key: 'fecha',
            encabezado: 'Fecha',
            ordenable: true,
            variant: 'fecha',
            render: (lote) => formatearFecha(lote.fecha),
        },
        {
            key: 'producto',
            encabezado: 'Producto',
            ordenable: true,
            valorOrdenamiento: (lote) => lote.producto.nombre.toLowerCase(),
            render: (lote) => (
                <Link to={`/productos/${lote.producto.id}`} className={estilos.enlaceProducto}>
                    {lote.producto.nombre}
                </Link>
            ),
        },
        {
            key: 'cantidad',
            encabezado: 'Cantidad',
            ordenable: true,
            render: (lote) => formatearCantidad(lote.cantidad, lote.producto.unidad_medida.nombre),
        },
        {
            key: 'cerrado',
            encabezado: 'Estado',
            ordenable: true,
            render: (lote) => (
                <span className={`${estilosInsumos.estado} ${lote.cerrado ? estilosInsumos.estadoCerrado : estilosInsumos.estadoAbierto}`}>
                    {lote.cerrado ? 'Cerrado' : 'Abierto'}
                </span>
            ),
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (lote) => (
                <div className={styles.grupoBotonesTabla}>
                    <Boton variant="ver" title="Ver detalle del lote" onClick={() => setLoteSeleccionado(lote)} />
                </div>
            ),
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Historial de Lotes"
                descripcion={descripcion}
                acciones={
                    <Link to="/lotes-produccion/nuevo">
                        <Boton variant="crear">Registrar lote</Boton>
                    </Link>
                }
            />

            <div className={styles.filaBotonesSuperiores}>
                <div className={`${estilosFiltros.filtros} ${styles.infoFilaSuperior}`}>
                    <label className={estilosFiltros.campoFecha} style={{ width: '220px' }}>
                        Producto
                        <select
                            className={styles.filtroFecha}
                            value={productoId}
                            onChange={(evento) => setProductoId(evento.target.value)}
                        >
                            <option value="">Todos los productos</option>
                            {productos.map((producto) => (
                                <option key={producto.id} value={String(producto.id)}>
                                    {producto.nombre}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={estilosFiltros.campoFecha}>
                        Desde
                        <input
                            type="date"
                            className={styles.filtroFecha}
                            value={fechaDesde}
                            max={fechaHasta || hoy}
                            onChange={(evento) => setFechaDesde(evento.target.value)}
                        />
                    </label>
                    <label className={estilosFiltros.campoFecha}>
                        Hasta
                        <input
                            type="date"
                            className={styles.filtroFecha}
                            value={fechaHasta}
                            min={fechaDesde || undefined}
                            max={hoy}
                            onChange={(evento) => setFechaHasta(evento.target.value)}
                        />
                    </label>
                    {hayFiltros && (
                        <Boton variant="limpiar" onClick={limpiarFiltros} style={{ height: '38px' }}>
                            Limpiar filtros
                        </Boton>
                    )}
                </div>
            </div>

            {!rangoValido && (
                <p style={{ color: 'var(--rojo-texto)' }}>La fecha desde no puede ser posterior a la fecha hasta.</p>
            )}
            {error && <p style={{ color: 'var(--rojo-texto)' }}>{error}</p>}

            <TablaPaginada
                key={clave}
                datos={lotes}
                columnas={columnas}
                gridTemplateColumns="1fr 1fr 2fr 1.4fr 1fr 0.8fr"
                itemsPorPagina={10}
                mensajeVacio={
                    cargando
                        ? 'Cargando lotes…'
                        : hayFiltros
                          ? 'No hay lotes con los filtros aplicados.'
                          : 'Todavía no hay lotes registrados.'
                }
                columnaOrdenInicial="fecha"
                ordenAscInicial={false}
            />

            {loteSeleccionado && (
                <LoteDetalleModal
                    lote={loteSeleccionado}
                    onActualizado={loteActualizado}
                    onClose={() => setLoteSeleccionado(null)}
                />
            )}
        </div>
    );
}
