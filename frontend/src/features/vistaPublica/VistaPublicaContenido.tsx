import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import type { VistaPublicaResumen } from '../../types/vistaPublica';
import styles from '../../styles/shared.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Props {
    resumen: VistaPublicaResumen;
}

function diaMes(fechaStr: string): string {
    const [, mes, dia] = fechaStr.split('-').map(Number);
    return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
}

export default function VistaPublicaContenido({ resumen }: Props) {
    const fechaFormateada = resumen.fecha_actualizacion
        ? new Date(resumen.fecha_actualizacion).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Actualizado';

    const serie = resumen.serie_cumplimiento || [];

    const chartData = {
        labels: serie.map(item => diaMes(item.periodo)),
        datasets: [
            {
                label: 'Cumplimiento (%)',
                data: serie.map(item => item.porcentaje),
                backgroundColor: '#16a34a',
                borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                maxBarThickness: 20,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
            legend: { display: false },
            tooltip: {
                displayColors: false,
                callbacks: {
                    label: (context: any) => {
                        const val = context.raw;
                        return val === null ? 'Sin tareas' : `Cumplimiento: ${val}%`;
                    }
                }
            }
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                border: { display: false },
                grid: { color: 'rgba(226, 232, 240, 0.1)' },
                ticks: { color: '#8b939b', stepSize: 25, callback: (v: any) => `${v}%` }
            },
            x: {
                grid: { display: false },
                border: { color: 'rgba(226, 232, 240, 0.1)' },
                ticks: { color: '#8b939b', maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }
            }
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto', padding: '1rem', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--text-h)' }}>
                    Indicadores de Calidad
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Monitoreo continuo de cumplimiento y buenas prácticas de manufactura.
                </p>
            </div>

            <div className={styles.tarjeta} style={{ marginBottom: '1.25rem', textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Cumplimiento de Limpieza e Higiene
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#16a34a' }}>
                    {resumen.porcentaje_cumplimiento_limpieza !== null ? `${resumen.porcentaje_cumplimiento_limpieza}%` : 'N/A'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
                    Promedio global de tareas ejecutadas en los últimos 30 días
                </div>

                {serie.length > 0 && (
                    <div style={{ height: '180px', width: '100%', marginTop: '1rem' }}>
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                )}
            </div>

            <div className={styles.tarjeta} style={{ marginBottom: '1.25rem', textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Equipos con Calibración al Día
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                    {resumen.porcentaje_equipos_al_dia !== null ? `${resumen.porcentaje_equipos_al_dia}%` : 'N/A'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Dispositivos y maquinarias con mantenimiento vigente
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Última actualización: {fechaFormateada}</span>
            </div>
        </div>
    );
}
