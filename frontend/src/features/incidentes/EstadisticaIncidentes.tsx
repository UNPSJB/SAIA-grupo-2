import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';

import type { Incidente, TipoIncidente } from '../../types/incidentes';
import {
    getEstadisticasIncidentes,
    getIncidentes,
} from '../../services/incidentesServices';
import { ETIQUETA_TIPO, formatearFechaHora } from './estadoIncidente';
import type { EstadisticaIncidente } from '../../services/incidentesServices';
import styles from '../../styles/shared.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const TIPOS: TipoIncidente[] = [
    'rotura',
    'plaga',
    'devolucion_cliente',
    'otro',
];

function fechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function primerDiaDelMes(): string {
    const hoy = new Date();
    return fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
}

function hoyLocal(): string {
    return fechaLocal(new Date());
}

export default function EstadisticaIncidentes() {
    const [fechaDesde, setFechaDesde] = useState(primerDiaDelMes);
    const [fechaHasta, setFechaHasta] = useState(hoyLocal);
    const [estadisticas, setEstadisticas] = useState<EstadisticaIncidente[]>([]);
    const [tipoSeleccionado, setTipoSeleccionado] =
        useState<TipoIncidente | null>(null);
    const [detalle, setDetalle] = useState<Incidente[]>([]);
    const [cargando, setCargando] = useState(false);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelado = false;

        async function cargarEstadisticas() {
            if (!fechaDesde || !fechaHasta || fechaDesde > fechaHasta) {
                setEstadisticas([]);
                setError('La fecha desde no puede ser posterior a la fecha hasta.');
                return;
            }

            try {
                setCargando(true);
                setError(null);

                const resultado = await getEstadisticasIncidentes(
                    fechaDesde,
                    fechaHasta,
                );

                if (!cancelado) {
                    // Incluye también categorías que no tengan incidentes.
                    setEstadisticas(
                        TIPOS.map((tipo) => ({
                            tipo,
                            cantidad:
                                resultado.find((item) => item.tipo === tipo)
                                    ?.cantidad ?? 0,
                        })),
                    );
                }
            } catch (problema) {
                console.error('Error al cargar estadísticas:', problema);
                if (!cancelado) {
                    setError('No se pudieron cargar las estadísticas.');
                    setEstadisticas([]);
                }
            } finally {
                if (!cancelado) setCargando(false);
            }
        }

        void cargarEstadisticas();

        return () => {
            cancelado = true;
        };
    }, [fechaDesde, fechaHasta]);

    useEffect(() => {
        let cancelado = false;

        async function cargarDetalle() {
            if (
                !tipoSeleccionado ||
                !fechaDesde ||
                !fechaHasta ||
                fechaDesde > fechaHasta
            ) {
                setDetalle([]);
                return;
            }

            try {
                setCargandoDetalle(true);

                const incidentes = await getIncidentes(
                    undefined,
                    tipoSeleccionado,
                );

                if (!cancelado) {
                    setDetalle(
                        incidentes.filter((incidente) => {
                            const fecha = new Date(
                                incidente.fecha_hora_reporte,
                            );
                            const diaLocal = fechaLocal(fecha);
                            return diaLocal >= fechaDesde && diaLocal <= fechaHasta;
                        }),
                    );
                }
            } catch (problema) {
                console.error('Error al cargar el detalle:', problema);
                if (!cancelado) setDetalle([]);
            } finally {
                if (!cancelado) setCargandoDetalle(false);
            }
        }

        void cargarDetalle();

        return () => {
            cancelado = true;
        };
    }, [tipoSeleccionado, fechaDesde, fechaHasta]);

    const datosGrafico = {
        labels: TIPOS.map((tipo) => ETIQUETA_TIPO[tipo]),
        datasets: [
            {
                label: 'Cantidad de incidentes',
                data: TIPOS.map(
                    (tipo) =>
                        estadisticas.find((item) => item.tipo === tipo)
                            ?.cantidad ?? 0,
                ),
                backgroundColor: [
                    '#4776a8',
                    '#d49b37',
                    '#4a9871',
                    '#8b78b8',
                ],
                borderRadius: 5,
            },
        ],
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Estadísticas de Incidentes</h2>

            <p
                style={{
                    marginTop: '-10px',
                    marginBottom: '20px',
                    color: 'var(--text-muted)',
                }}
            >
                Cantidad de incidentes reportados por categoría durante un período.
            </p>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    alignItems: 'end',
                    marginBottom: '24px',
                }}
            >
                <label>
                    <span style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                        Desde
                    </span>
                    <input
                        type="date"
                        className={styles.filtroFecha}
                        value={fechaDesde}
                        max={fechaHasta || hoyLocal()}
                        onChange={(evento) => setFechaDesde(evento.target.value)}
                    />
                </label>

                <label>
                    <span style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                        Hasta
                    </span>
                    <input
                        type="date"
                        className={styles.filtroFecha}
                        value={fechaHasta}
                        min={fechaDesde || undefined}
                        max={hoyLocal()}
                        onChange={(evento) => setFechaHasta(evento.target.value)}
                    />
                </label>
            </div>

            {error && (
                <p style={{ color: 'var(--rojo-texto)' }}>{error}</p>
            )}

            <section
                className={styles.tarjetaEstatica}
                style={{
                    width: '100%',
                    maxWidth: '900px',
                    boxSizing: 'border-box',
                    padding: '24px',
                    textAlign: 'left',
                }}
            >
                <h3 style={{ marginTop: 0 }}>Incidentes por tipo</h3>

                {cargando ? (
                    <p style={{ color: 'var(--text-muted)' }}>
                        Cargando estadísticas...
                    </p>
                ) : (
                    <div style={{ width: '100%', minHeight: '280px' }}>
                        <Bar
                            data={datosGrafico}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false,
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) =>
                                                ` ${context.parsed.y} incidente(s)`,
                                        },
                                    },
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            precision: 0,
                                        },
                                    },
                                },
                                onClick: (_evento, elementos) => {
                                    if (elementos.length > 0) {
                                        const indice = elementos[0].index;
                                        setTipoSeleccionado(TIPOS[indice]);
                                    }
                                },
                            }}
                        />
                    </div>
                )}

                <p
                    style={{
                        marginBottom: 0,
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                    }}
                >
                Pasá el cursor sobre una barra para ver la cantidad de incidentes.                </p>
            </section>

            {tipoSeleccionado && (
                <section
                    style={{
                        width: '100%',
                        maxWidth: '900px',
                        marginTop: '28px',
                        textAlign: 'left',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                        }}
                    >
                        <h3>
                            Detalle: {ETIQUETA_TIPO[tipoSeleccionado]}
                        </h3>

                        <button
                            type="button"
                            onClick={() => setTipoSeleccionado(null)}
                        >
                            Cerrar detalle
                        </button>
                    </div>

                    {cargandoDetalle ? (
                        <p>Cargando incidentes...</p>
                    ) : detalle.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>
                            No hay incidentes de este tipo en el período seleccionado.
                        </p>
                    ) : (
                        <div className={styles.contenedorTabla}>
                            <div
                                className={styles.filaHeader}
                                style={{
                                    gridTemplateColumns: '1.2fr 2fr 1fr',
                                }}
                            >
                                <div>Fecha</div>
                                <div>Descripción</div>
                                <div>Estado</div>
                            </div>

                            {detalle.map((incidente) => (
                                <div
                                    key={incidente.id}
                                    className={styles.filaItem}
                                    style={{
                                        gridTemplateColumns: '1.2fr 2fr 1fr',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        {formatearFechaHora(
                                            incidente.fecha_hora_reporte,
                                        )}
                                    </div>
                                    <div>{incidente.descripcion}</div>
                                    <div>{incidente.estado}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
