import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { LoteProduccion } from '../../types/lotesProduccion';
import type { Producto } from '../../types/productos';
import { getLotesDeProducto, getProductoById } from '../../services/productosServices';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import LoteDetalleModal from '../lotesProduccion/LoteDetalleModal';
import { ETIQUETA_TIPO_PRODUCTO, formatearCantidad, formatearFecha } from './formatoProducto';
import styles from '../../styles/shared.module.css';

interface Respuesta {
    clave: string;
    producto: Producto | null;
    lotes: LoteProduccion[];
    error: boolean;
}

export default function ProductoDetail() {
    const { id = '' } = useParams();
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [loteAbierto, setLoteAbierto] = useState<LoteProduccion | null>(null);

    useEffect(() => {
        let cancelado = false;

        Promise.all([getProductoById(id), getLotesDeProducto(id)])
            .then(([producto, lotes]) => {
                if (!cancelado) setRespuesta({ clave: id, producto, lotes, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar el producto:', problema);
                if (!cancelado) setRespuesta({ clave: id, producto: null, lotes: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, [id]);

    const actual = respuesta?.clave === id ? respuesta : null;
    const producto = actual?.producto ?? null;
    const lotes = actual?.lotes ?? [];
    const unidad = producto?.unidad_medida.nombre;
    const totalProducido = lotes.reduce((suma, lote) => suma + lote.cantidad, 0);

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
            key: 'cantidad',
            encabezado: 'Cantidad',
            ordenable: true,
            render: (lote) => formatearCantidad(lote.cantidad, unidad),
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (lote) => (
                <div className={styles.grupoBotonesTabla}>
                    <Boton variant="ver" title="Ver detalle del lote" onClick={() => setLoteAbierto(lote)} />
                </div>
            ),
        },
    ];

    if (actual === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Detalle del Producto" ancho="800px" />
                <p className={styles.textMuted}>Cargando producto…</p>
            </div>
        );
    }

    if (producto === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Detalle del Producto" ancho="800px" />
                <p style={{ color: 'var(--rojo-texto)' }}>No se encontró el producto.</p>
                <Link to="/productos">
                    <Boton variant="volver">Volver a la lista</Boton>
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={producto.nombre}
                descripcion="Detalle del producto y de los lotes producidos."
                ancho="800px"
                acciones={
                    <>
                        <Link to={`/productos/editar/${producto.id}`}>
                            <Boton variant="editar">Modificar</Boton>
                        </Link>
                        <Link to={`/lotes-produccion/nuevo?producto=${producto.id}`}>
                            <Boton variant="crear">Registrar lote</Boton>
                        </Link>
                    </>
                }
            />

            <div className={styles.tarjetaEstatica} style={{ maxWidth: '800px', width: '100%', boxSizing: 'border-box' }}>
                <p><strong>Tipo:</strong> {ETIQUETA_TIPO_PRODUCTO[producto.tipo]}</p>
                <p><strong>Unidad de medida:</strong> {producto.unidad_medida.nombre}</p>
                <p><strong>Stock:</strong> {formatearCantidad(producto.stock, unidad)}</p>
                <p style={{ marginBottom: '20px' }}>
                    <strong>Total producido:</strong>{' '}
                    {lotes.length === 0
                        ? 'Sin lotes registrados'
                        : `${formatearCantidad(totalProducido, unidad)} en ${lotes.length} ${lotes.length === 1 ? 'lote' : 'lotes'}`}
                </p>

                <div className={styles.accordion}>
                    <details className={styles.accordionItem} open={lotes.length > 0}>
                        <summary className={styles.accordionHeader}>
                            <strong>Lotes producidos ({lotes.length})</strong>{' '}
                            <svg
                                className={styles.accordionIcon}
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="m2 5 6 6 6-6" />
                            </svg>
                        </summary>
                        <div className={styles.accordionBody}>
                            <TablaPaginada
                                datos={lotes}
                                columnas={columnas}
                                gridTemplateColumns="1fr 1.2fr 1.4fr 0.8fr"
                                itemsPorPagina={8}
                                mensajeVacio="Este producto todavía no tiene lotes registrados."
                                columnaOrdenInicial="fecha"
                                ordenAscInicial={false}
                            />
                        </div>
                    </details>
                </div>

                <div className={styles.bloqueDetalle}>
                    <Link to="/productos">
                        <Boton variant="volver">Volver a la lista</Boton>
                    </Link>
                </div>
            </div>

            {loteAbierto && (
                <LoteDetalleModal
                    lote={loteAbierto}
                    enlazarProducto={false}
                    onClose={() => setLoteAbierto(null)}
                />
            )}
        </div>
    );
}
