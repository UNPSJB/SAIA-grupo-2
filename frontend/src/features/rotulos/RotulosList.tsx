
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { Producto } from '../../types/productos';
import type { Rotulo, CompletitudRotulo } from '../../types/rotulos';

import { getProductos } from '../../services/productosServices';
import { getRotulos, getCompletitudRotulo } from '../../services/rotulosServices';

import Boton from '../../components/Boton';
import BuscadorTexto from '../../components/BuscadorTexto';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';

import { filtrarPorTexto } from '../../utils/texto';
import { ETIQUETA_TIPO_PRODUCTO } from '../productos/formatoProducto';

import styles from '../../styles/shared.module.css';
import estilos from './RotulosList.module.css';

interface FilaRotulo {
    producto: Producto;
    rotulo: Rotulo | null;
    completitud: CompletitudRotulo | null;
}

interface Respuesta {
    filas: FilaRotulo[];
    error: boolean;
}

function estadoRotulo(fila: FilaRotulo): string {
    if (!fila.rotulo) return 'Pendiente';
    if (!fila.completitud) return 'Sin calcular';
    return fila.completitud.completo ? 'Completo' : 'Incompleto';
}

export default function RotulosList() {
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [filtroSellos, setFiltroSellos] = useState<string>('todos');

    useEffect(() => {
        let cancelado = false;

        const cargar = async () => {
            try {
                const [productos, rotulos] = await Promise.all([
                    getProductos(),
                    getRotulos(),
                ]);

                const rotulosPorProducto = new Map<number, Rotulo>(
                    rotulos.map((rotulo) => [rotulo.producto_id, rotulo]),
                );

                const filas = await Promise.all(
                    productos.map(async (producto): Promise<FilaRotulo> => {
                        const rotulo = rotulosPorProducto.get(producto.id) ?? null;

                        if (!rotulo) {
                            return { producto, rotulo: null, completitud: null };
                        }

                        try {
                            const completitud = await getCompletitudRotulo(rotulo.id);
                            return { producto, rotulo, completitud };
                        } catch (problema) {
                            console.error(
                                `Error al calcular la completitud del rótulo ${rotulo.id}:`,
                                problema,
                            );
                            return { producto, rotulo, completitud: null };
                        }
                    }),
                );

                if (!cancelado) {
                    setRespuesta({ filas, error: false });
                }
            } catch (problema) {
                console.error('Error al cargar el listado de rótulos:', problema);
                if (!cancelado) {
                    setRespuesta({ filas: [], error: true });
                }
            }
        };

        cargar();

        return () => {
            cancelado = true;
        };
    }, []);

    const filas = respuesta?.filas ?? [];

    const filasFiltradasPorOpcion = filas.filter((fila) => {
        const estado = estadoRotulo(fila);
        if (filtroEstado !== 'todos' && estado !== filtroEstado) {
            return false;
        }

        if (filtroSellos !== 'todos') {
            const tieneSellos = Boolean(
                fila.rotulo?.sellos_snapshot &&
                Array.isArray(fila.rotulo.sellos_snapshot) &&
                fila.rotulo.sellos_snapshot.length > 0
            );
            if (filtroSellos === 'con_sellos' && !tieneSellos) return false;
            if (filtroSellos === 'sin_sellos' && tieneSellos) return false;
        }

        return true;
    });

    const filtradas = filtrarPorTexto(filasFiltradasPorOpcion, busqueda, (fila) => [
        fila.producto.nombre,
        ETIQUETA_TIPO_PRODUCTO[fila.producto.tipo],
        estadoRotulo(fila),
        ...(fila.completitud?.faltantes ?? []),
    ]);

    const columnas: Columna<FilaRotulo>[] = [
        {
            key: 'producto',
            encabezado: 'Producto',
            ordenable: true,
            variant: 'titulo',
            valorOrdenamiento: (fila) => fila.producto.nombre,
            render: (fila) => fila.producto.nombre,
        },
        {
            key: 'tipo',
            encabezado: 'Tipo',
            ordenable: true,
            valorOrdenamiento: (fila) => fila.producto.tipo,
            render: (fila) => ETIQUETA_TIPO_PRODUCTO[fila.producto.tipo],
        },
        {
            key: 'estado',
            encabezado: 'Estado',
            ordenable: true,
            valorOrdenamiento: estadoRotulo,
            render: (fila) => {
                const estado = estadoRotulo(fila);

                const clase =
                    estado === 'Completo'
                        ? estilos.estadoCompleto
                        : estado === 'Incompleto'
                          ? estilos.estadoIncompleto
                          : estado === 'Pendiente'
                            ? estilos.estadoPendiente
                            : estilos.estadoSinCalcular;

                return <span className={`${estilos.estado} ${clase}`}>{estado}</span>;
            },
        },
        {
            key: 'completitud',
            encabezado: 'Completitud',
            ordenable: true,
            valorOrdenamiento: (fila) => fila.completitud?.porcentaje_completitud ?? -1,
            render: (fila) =>
                fila.rotulo
                    ? fila.completitud
                        ? `${fila.completitud.porcentaje_completitud}%`
                        : '—'
                    : '—',
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (fila) => (
                <div className={styles.grupoBotonesTabla}>
                    <Link to={`/rotulos/producto/${fila.producto.id}`}>
                        <Boton
                            variant={fila.rotulo ? 'ver' : 'crear'}
                            title={fila.rotulo ? 'Ver y completar rótulo' : 'Crear rótulo'}
                        />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Rótulos"
                descripcion="Administración de los datos que integran el rótulo de cada producto."
            />

            <div className={styles.filaBotonesSuperiores} style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <BuscadorTexto
                    valor={busqueda}
                    onCambio={setBusqueda}
                    placeholder="Buscar producto o estado..."
                />

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Estado:
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-h)', fontSize: '0.85rem' }}
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="Completo">Completo</option>
                            <option value="Incompleto">Incompleto</option>
                            <option value="Pendiente">Pendiente</option>
                        </select>
                    </label>

                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Sellos:
                        <select
                            value={filtroSellos}
                            onChange={(e) => setFiltroSellos(e.target.value)}
                            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-h)', fontSize: '0.85rem' }}
                        >
                            <option value="todos">Todos los sellos</option>
                            <option value="con_sellos">Con Sellos de Advertencia</option>
                            <option value="sin_sellos">Sin Sellos de Advertencia</option>
                        </select>
                    </label>
                </div>
            </div>

            {respuesta?.error && (
                <p style={{ color: 'var(--rojo-texto)' }}>
                    No se pudo cargar el listado de rótulos.
                </p>
            )}

            <TablaPaginada
                datos={filtradas}
                columnas={columnas}
                gridTemplateColumns="2fr 1fr 1.2fr 1fr 0.8fr"
                itemsPorPagina={10}
                mensajeVacio={
                    respuesta === null
                        ? 'Cargando productos y rótulos…'
                        : busqueda
                          ? 'No hay productos que coincidan con la búsqueda.'
                          : 'Todavía no hay productos registrados.'
                }
                columnaOrdenInicial="producto"
                tituloExportacion="listado_rotulos"
            />
        </div>
    );
}
