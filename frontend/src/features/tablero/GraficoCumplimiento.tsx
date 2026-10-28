import { useEffect, useState } from 'react';
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';

import type { GraficoCumplimientoItem } from "../../types/tablero";
import { getGraficoCumplimiento } from "../../services/tableroServices";
import styles from '../../styles/shared.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function fechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function haceUnaSemanaLocal(): string {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() - 7);
    return fechaLocal(hoy);
}

function hoyLocal(): string {
    return fechaLocal(new Date());
}

function RenderizadorGrafico({ items }: { items: GraficoCumplimientoItem[] }) {
    const datosGrafico = {
        labels: items.map((item) => item.periodo),
        datasets: [
            {
                label: 'Porcentaje de cumplimiento',
                data: items.map((item) => item.porcentaje),
                backgroundColor: '#4776a8',
                borderRadius: 5,
            },
        ],
    };

    return (
        <div style={{ width: '100%', minHeight: '280px', height: '320px'}}>
            <Bar
                data={datosGrafico}
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false},
                        tooltip: {
                            callbacks: {
                                label: (context) => ` Cumplimiento: ${context.parsed.y}%`,
                            },
                        },
                    },
                    scales: {
                        y: {
                            min: 0,
                            max: 100,
                            ticks: {callback: (value) => `${value}%` },
                        },
                    },
                }}
            />    
        </div>
    );
}
export default function GraficoCumplimiento() {
    const [fechaDesde, setFechaDesde] = useState(haceUnaSemanaLocal);
    const [fechaHasta, setFechaHasta] = useState(hoyLocal);
    const [granularidad, setGranularidad] = useState<'dia' | 'semana'>('dia');
    const [datos, setDatos] = useState<GraficoCumplimientoItem[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelado = false;

        async function cargarDatos() {
            if (!fechaDesde || !fechaHasta || fechaDesde > fechaHasta){
                setDatos([]);
                setError('La fecha desde no puede ser posterior a la fecha hasta.');
                return;
            }

            try {
                setCargando(true);
                setError(null);
                
                const resultado = await getGraficoCumplimiento(
                    fechaDesde,
                    fechaHasta,
                    granularidad
                );

                if (!cancelado) {
                    setDatos(resultado.serie || []);
                }
            } catch(problema) {
                console.error('Error al cargar datos de cumplimiento', problema);
                if(!cancelado) {
                    setError('No se pudieron cargar las estadísticas de cumplimiento');
                    setDatos([]);
                }
            } finally {
                if (!cancelado) setCargando(false);
            }
        }

        void cargarDatos();

        return () => {
            cancelado = true;
        };
    }, [fechaDesde, fechaHasta, granularidad]);


    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gráfico de Cumplimiento de Limpieza</h2>

            <p
                style={{
                    marginTop: '-10px',
                    marginBottom: '20px',
                    color: 'var(--text-muted)',
                }}
            >
                Porcentaje de cumplimiento de checklists de limpieza calculado por día o semana.
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
                    <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
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
                    <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>
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

                <label>
                    <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>
                        Visualizar por
                    </span>
                    <select
                        className={styles.filtroFecha}
                        style={{ background: 'var(--bg-principal, #fff)', cursor: 'pointer'}}
                        value={granularidad}
                        onChange={(evento) => setGranularidad(evento.target.value as 'dia' | 'semana')}
                    >
                        <option value="dia">Día</option>
                        <option value="semana">Semana</option>
                    </select>
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
                <h3 style={{ marginTop: 0}}>Cumplimiento a lo largo del tiempo</h3>

                {cargando ? (
                    <p style={{ color: 'var(--text-muted)' }}>
                        Cargando gráfico de cumplimiento...
                    </p>
                ) : datos.length === 0 ?(
                    <p style={{ color: 'var(--text-muted)'}}>
                        No hay registros en el rango seleccionado.
                    </p>
                ) : (
                    <RenderizadorGrafico items={datos} />
                
                )}

                <p
                    style={{
                        marginBottom: 0,
                        marginTop: '12px',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                    }}
                >
                    Pasá el cursor sobre una barra para evaluar la tasa exacta del período.
                </p>
            </section>
        </div>
    );
}