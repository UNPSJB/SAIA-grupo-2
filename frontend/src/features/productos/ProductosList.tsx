import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { Producto } from '../../types/productos';
import { getProductos } from '../../services/productosServices';
import Boton from '../../components/Boton';
import BuscadorTexto from '../../components/BuscadorTexto';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import { filtrarPorTexto } from '../../utils/texto';
import { ETIQUETA_TIPO_PRODUCTO, formatearCantidad } from './formatoProducto';
import styles from '../../styles/shared.module.css';

interface Respuesta {
    productos: Producto[];
    error: boolean;
}

export default function ProductosList() {
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        let cancelado = false;

        getProductos()
            .then((productos) => {
                if (!cancelado) setRespuesta({ productos, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar los productos:', problema);
                if (!cancelado) setRespuesta({ productos: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, []);

    const productos = respuesta?.productos ?? [];
    const filtrados = filtrarPorTexto(productos, busqueda, (producto) => [
        producto.nombre,
        ETIQUETA_TIPO_PRODUCTO[producto.tipo],
        producto.unidad_medida.nombre,
    ]);

    const columnas: Columna<Producto>[] = [
        {
            key: 'nombre',
            encabezado: 'Nombre',
            ordenable: true,
            variant: 'titulo',
            render: (producto) => producto.nombre,
        },
        {
            key: 'tipo',
            encabezado: 'Tipo',
            ordenable: true,
            render: (producto) => ETIQUETA_TIPO_PRODUCTO[producto.tipo],
        },
        {
            key: 'stock',
            encabezado: 'Stock',
            ordenable: true,
            render: (producto) => formatearCantidad(producto.stock, producto.unidad_medida.nombre),
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (producto) => (
                <div className={styles.grupoBotonesTabla}>
                    <Link to={`/productos/${producto.id}`}>
                        <Boton variant="ver" title="Ver detalle y lotes" />
                    </Link>
                    <Link to={`/productos/editar/${producto.id}`}>
                        <Boton variant="editar" title="Modificar producto" />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Productos"
                descripcion="Productos que elabora el establecimiento. Desde el detalle de cada uno se consultan sus lotes."
                acciones={
                    <Link to="/productos/nuevo">
                        <Boton variant="crear">Nuevo Producto</Boton>
                    </Link>
                }
            />

            <div className={styles.filaBotonesSuperiores}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar producto..." />
            </div>

            {respuesta?.error && <p style={{ color: 'var(--rojo-texto)' }}>No se pudieron cargar los productos.</p>}

            <TablaPaginada
                datos={filtrados}
                columnas={columnas}
                gridTemplateColumns="2.2fr 1.5fr 1.3fr 1fr"
                itemsPorPagina={10}
                mensajeVacio={
                    respuesta === null
                        ? 'Cargando productos…'
                        : busqueda
                          ? 'No hay productos que coincidan con la búsqueda.'
                          : 'Todavía no hay productos registrados.'
                }
                columnaOrdenInicial="nombre"
            />
        </div>
    );
}
