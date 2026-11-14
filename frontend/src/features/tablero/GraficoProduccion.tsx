

import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';

import type { EstadisticasProduccion } from '../../types/tablero';
import { getEstadisticasProduccion } from '../../services/tableroServices';
import { useAuth } from '../../context/AuthContext';
import estilos from '../../components/Estadisticas.module.css';
import styles from '../../styles/shared.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const COLOR_BARRA = '#4e96e2';
const COLOR_GRILLA = 'rgba(226, 232, 240, 0.08)';
const COLOR_TEXTO_EJE = '#8b939b';

interface Respuesta {
    clave: string;
    datos: EstadisticasProduccion;
    error: boolean;
}

function fechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function haceDias(dias: number): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fechaLocal(fecha);
}

function formatoFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
    });
}

function formatoCantidad(cantidad: number): string {
    return cantidad.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export default function GraficoProduccion() {
    const { usuario } = useAuth();
    const rol = usuario?.rol;

    const hoy = fechaLocal(new Date());

    const [fechaDesde, setFechaDesde] = useState(() => haceDias(29));
    const [fechaHasta, setFechaHasta] = useState(hoy);
    const [productoSeleccionado, setProductoSeleccionado] = useState('');
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

    const rangoValido = Boolean(fechaDesde && fechaHasta && fechaDesde <= fechaHasta);
    const clave = `${fechaDesde}|${fechaHasta}|${rol}`;

    useEffect(() => {
        if (!rangoValido || rol !== 'admin') return;

        let cancelado = false;

        getEstadisticasProduccion(fechaDesde, fechaHasta, rol)
            .then((datos) => {
                if (!cancelado) {
                    setRespuesta({ clave, datos, error: false });
                }
            })
            .catch((problema) => {
                console.error('Error al cargar las estadísticas de producción:', problema);
                if (!cancelado) {
                    setRespuesta({
                        clave,
                        datos: {
                            totales_por_producto: [],
                            evolucion_por_producto: [],
                        },
                        error: true,
                    });
                }
            });

        return () => {
            cancelado = true;
        };
    }, [clave, fechaDesde, fechaHasta, rangoValido, rol]);

    const cargando = rangoValido && respuesta?.clave !== clave;
    const errorCarga = !cargando && respuesta?.error === true;
    const datos = !cargando && respuesta && !respuesta.error ? respuesta.datos : null;

    const productos = datos?.totales_por_producto ?? [];

    const productoActual =
        productos.find((producto) => String(producto.producto_id) === productoSeleccionado) ??
        productos[0];

    const serie = productoActual
        ? (datos?.evolucion_por_producto ?? []).filter(
              (item) => item.producto_id === productoActual.producto_id,
          )
        : [];

    const totalProducido = productoActual?.cantidad ?? 0;
    const unidad = productoActual?.unidad_medida.nombre ?? '';

    const aplicarRango = (dias: number) => {
        setFechaDesde(haceDias(dias - 1));
        setFechaHasta(hoy);
    };

    return (
        <section className={estilos.tarjeta}>
            <div className={estilos.tarjetaEncabezado}>
                <h3>Estadísticas de producción</h3>
                <span className={estilos.tarjetaAyuda}>
                    Cantidad producida por producto y fecha
                </span>
            </div>

            <div className={estilos.filtros}>
                <label className={estilos.campoFecha}>
                    Desde
                    <input
                        type="date"
                        className={styles.filtroFecha}
                        value={fechaDesde}
                        max={fechaHasta || hoy}
                        onChange={(evento) => setFechaDesde(evento.target.value)}
                    />
                </label>

                <label className={estilos.campoFecha}>
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

                <label className={estilos.campoFecha}>
                    Producto
                    <select
                        className={styles.filtroFecha}
                        value={productoActual ? String(productoActual.producto_id) : ''}
                        onChange={(evento) => setProductoSeleccionado(evento.target.value)}
                        disabled={productos.length === 0 || cargando}
                    >
                        {productos.map((producto) => (
                            <option key={producto.producto_id} value={producto.producto_id}>
                                {producto.producto}
                            </option>
                        ))}
                    </select>
                </label>

                <div className={estilos.rangos}>
                    <button
                        type="button"
                        className={estilos.rango}
                        onClick={() => aplicarRango(7)}
                    >
                        7 días
                    </button>
                    <button
                        type="button"
                        className={estilos.rango}
                        onClick={() => aplicarRango(30)}
                    >
                        30 días
                    </button>
                    <button
                        type="button"
                        className={estilos.rango}
                        onClick={() => aplicarRango(90)}
                    >
                        90 días
                    </button>
                </div>
            </div>

            {!rangoValido && (
                <p className={estilos.aviso}>
                    La fecha inicial no puede ser posterior a la fecha final.
                </p>
            )}

            {cargando && <p className={estilos.vacio}>Cargando estadísticas de producción...</p>}

            {errorCarga && (
                <p className={estilos.aviso}>
                    No se pudieron cargar las estadísticas de producción.
                </p>
            )}

            {!cargando && !errorCarga && datos && productos.length === 0 && (
                <p className={estilos.vacio}>
                    No hay producción registrada en el período seleccionado.
                </p>
            )}

            {!cargando && !errorCarga && productoActual && (
                <>
                    <div className={estilos.indicadores}>
                        <div className={estilos.indicador}>
                            <span className={estilos.indicadorTitulo}>Producción total</span>
                            <span className={estilos.indicadorValor}>
                                {formatoCantidad(totalProducido)}
                            </span>
                            <span className={estilos.indicadorDetalle}>
                                {productoActual.producto} · {unidad}
                            </span>
                        </div>
                    </div>

                    {serie.length > 0 ? (
                        <div className={estilos.lienzoGrafico}>
                            <Bar
                                role="img"
                                aria-label={`Producción de ${productoActual.producto}: ${serie
                                    .map(
                                        (item) =>
                                            `${formatoFecha(item.fecha)}: ${formatoCantidad(item.cantidad)} ${unidad}`,
                                    )
                                    .join('; ')}`}
                                data={{
                                    labels: serie.map((item) => formatoFecha(item.fecha)),
                                    datasets: [
                                        {
                                            label: `Producción (${unidad})`,
                                            data: serie.map((item) => item.cantidad),
                                            backgroundColor: COLOR_BARRA,
                                            hoverBackgroundColor: COLOR_BARRA,
                                            borderRadius: {
                                                topLeft: 4,
                                                topRight: 4,
                                                bottomLeft: 0,
                                                bottomRight: 0,
                                            },
                                            borderSkipped: 'bottom',
                                            maxBarThickness: 32,
                                        },
                                    ],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    animation: { duration: 250 },
                                    interaction: { mode: 'index', intersect: false },
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            displayColors: false,
                                            callbacks: {
                                                title: (elementos) =>
                                                    serie[elementos[0].dataIndex]
                                                        ? new Date(
                                                              ...serie[elementos[0].dataIndex].fecha
                                                                  .split('-')
                                                                  .map(Number)
                                                                  .map((valor, indice) =>
                                                                      indice === 1 ? valor - 1 : valor,
                                                                  ) as [number, number, number],
                                                          ).toLocaleDateString('es-AR', {
                                                              day: 'numeric',
                                                              month: 'long',
                                                              year: 'numeric',
                                                          })
                                                        : '',
                                                label: (contexto) =>
                                                    `${formatoCantidad(Number(contexto.parsed.y))} ${unidad}`,
                                            },
                                        },
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            border: { display: false },
                                            grid: { color: COLOR_GRILLA },
                                            ticks: { color: COLOR_TEXTO_EJE },
                                        },
                                        x: {
                                            grid: { display: false },
                                            border: { color: COLOR_GRILLA },
                                            ticks: {
                                                color: COLOR_TEXTO_EJE,
                                                autoSkip: true,
                                                maxTicksLimit: 12,
                                                maxRotation: 0,
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                    ) : (
                        <p className={estilos.vacio}>
                            No hay producción registrada para este producto en el período.
                        </p>
                    )}
                </>
            )}
            
        </section>
    );
}
