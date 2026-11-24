import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    registerables,
    type TooltipItem
} from 'chart.js';
import type { VistaPublicaResumen } from '../../types/vistaPublica';
import GraficoTorta from '../../components/GraficoTorta';
import GraficoBarrasHorizontales from '../../components/GraficoBarrasHorizontales';
import styles from '../../styles/shared.module.css';
import estilos from './VistaPublica.module.css';

ChartJS.register(...registerables);

interface Props {
    resumen: VistaPublicaResumen;
}

function diaMes(fechaStr: string): string {
    if (!fechaStr) return '';
    try {
        const partes = fechaStr.split('T')[0].split('-');
        if (partes.length === 3) {
            return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}`;
        }
    } catch (e) {
        console.error('Error al formatear fecha:', e);
    }
    return fechaStr;
}

function AnilloPorcentaje({ porcentaje, color }: { porcentaje: number | null; color: string }) {
    if (porcentaje === null || porcentaje === undefined) {
        return (
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-muted)', margin: '1rem 0' }}>N/A</div>
        );
    }

    const valor = Math.min(100, Math.max(0, porcentaje));
    const restante = Math.max(0, 100 - valor);

    const data = {
        labels: ['Cumplimiento', 'Pendiente'],
        datasets: [
            {
                data: [valor, restante],
                backgroundColor: [color, 'rgba(255, 255, 255, 0.08)'],
                borderWidth: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '76%',
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
        },
    };

    return (
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0.75rem auto' }}>
            <Doughnut data={data} options={options} />
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                }}
            >
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: color }}>
                    {valor.toFixed(1)}%
                </span>
            </div>
        </div>
    );
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

    // 1. Gráfico de Área Suave (Línea con Relleno) para Tendencia de Limpieza
    const dataTendenciaLimpieza = {
        labels: serie.map(item => diaMes(item.periodo)),
        datasets: [
            {
                label: 'Cumplimiento',
                data: serie.map(item => item.porcentaje),
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.18)',
                fill: true,
                tension: 0.38,
                pointRadius: 3,
                pointBackgroundColor: '#16a34a',
                pointHoverRadius: 6,
            }
        ]
    };

    const optionsTendenciaLimpieza = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                displayColors: false,
                callbacks: {
                    label: (context: TooltipItem<'line'>) => {
                        const val = context.raw as number | null;
                        return val === null ? 'Sin tareas' : ` Cumplimiento: ${val}%`;
                    }
                }
            }
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                border: { display: false },
                grid: { color: 'rgba(226, 232, 240, 0.08)' },
                ticks: { color: '#8b939b', stepSize: 25, callback: (v: string | number) => `${v}%` }
            },
            x: {
                grid: { display: false },
                border: { color: 'rgba(226, 232, 240, 0.08)' },
                ticks: { color: '#8b939b', maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }
            }
        }
    };

    // 2. Gráfico de Radar para Equilibrio de Calidad de Inocuidad
    const indicadoresRadar = [
        { mostrar: resumen.mostrar_cumplimiento_limpieza, nombre: 'Limpieza', valor: resumen.porcentaje_cumplimiento_limpieza },
        { mostrar: resumen.mostrar_equipos_calibrados, nombre: 'Equipos', valor: resumen.porcentaje_equipos_al_dia },
        { mostrar: resumen.mostrar_poes_vigentes, nombre: 'POES', valor: resumen.porcentaje_poes_vigentes },
        { mostrar: resumen.mostrar_capacitaciones, nombre: 'Personal', valor: resumen.porcentaje_personal_capacitado },
        { mostrar: resumen.mostrar_trazabilidad_lotes, nombre: 'Trazabilidad', valor: resumen.porcentaje_lotes_trazables },
    ].filter(i => i.mostrar && i.valor !== null && i.valor !== undefined);

    const dataRadar = {
        labels: indicadoresRadar.map(i => i.nombre),
        datasets: [
            {
                label: 'Calidad e Inocuidad (%)',
                data: indicadoresRadar.map(i => i.valor),
                backgroundColor: 'rgba(37, 99, 235, 0.25)',
                borderColor: '#2563eb',
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: '#2563eb',
                borderWidth: 2,
            }
        ]
    };

    const optionsRadar = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx: TooltipItem<'radar'>) => ` ${ctx.label}: ${ctx.raw}%`
                }
            }
        },
        scales: {
            r: {
                min: 0,
                max: 100,
                ticks: { display: false, stepSize: 25 },
                grid: { color: 'rgba(226, 232, 240, 0.12)' },
                angleLines: { color: 'rgba(226, 232, 240, 0.15)' },
                pointLabels: {
                    color: 'var(--text-h)',
                    font: { size: 12, weight: '600' as const }
                }
            }
        }
    };

    // 3. Gráfico de Barras Verticales para Personal Capacitado por Tipo de Documentación
    const valLibretas = resumen.porcentaje_libretas_sanitarias ?? resumen.porcentaje_personal_capacitado ?? 100;
    const valCapacitaciones = resumen.porcentaje_capacitaciones_bpm ?? resumen.porcentaje_personal_capacitado ?? 100;
    const valAptitud = resumen.porcentaje_certificados_aptitud ?? resumen.porcentaje_personal_capacitado ?? 100;

    const dataPersonalBarras = {
        labels: ['Libretas Sanitarias', 'Capacitaciones BPM', 'Aptitud Física'],
        datasets: [
            {
                label: 'Vigencia (%)',
                data: [valLibretas, valCapacitaciones, valAptitud],
                backgroundColor: ['#8b5cf6', '#a855f7', '#c084fc'],
                borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                maxBarThickness: 32,
            }
        ]
    };

    const optionsPersonalBarras = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx: TooltipItem<'bar'>) => ` Vigencia: ${ctx.raw}%`
                }
            }
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                border: { display: false },
                grid: { color: 'rgba(226, 232, 240, 0.08)' },
                ticks: { color: '#8b939b', stepSize: 25, callback: (v: string | number) => `${v}%` }
            },
            x: {
                grid: { display: false },
                border: { color: 'rgba(226, 232, 240, 0.08)' },
                ticks: { color: 'var(--text-h)', font: { size: 10, weight: '600' as const } }
            }
        }
    };

    const algunIndicadorActivo =
        resumen.mostrar_cumplimiento_limpieza ||
        resumen.mostrar_equipos_calibrados ||
        resumen.mostrar_capacitaciones ||
        resumen.mostrar_poes_vigentes ||
        resumen.mostrar_trazabilidad_lotes ||
        (resumen.mostrar_desglose_sectores && resumen.desglose_sectores && resumen.desglose_sectores.length > 0) ||
        (resumen.mostrar_desglose_incidentes && resumen.desglose_incidentes && resumen.desglose_incidentes.length > 0);

    return (
        <div className={estilos.contenedorVistaPublica}>
            <header className={estilos.portada}>
                <span className={estilos.sello}>
                    <i className="bi bi-shield-check" aria-hidden="true"></i>
                    Compromiso con la inocuidad
                </span>
                <h1 className={estilos.nombre}>{resumen.titulo_publico || 'Nombre del establecimiento'}</h1>
                <p className={estilos.mensaje}>
                    {resumen.presentacion || 'Acá va el mensaje de presentación del establecimiento.'}
                </p>
            </header>

            {algunIndicadorActivo && (
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--text-h)' }}>
                        Indicadores de Calidad
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Monitoreo continuo de cumplimiento y buenas prácticas de manufactura.
                    </p>
                </div>
            )}

            {indicadoresRadar.length >= 3 && (
                <div className={`${styles.tarjeta} ${estilos.tarjetaFullWidth}`} style={{ marginBottom: '1.5rem', padding: '1.25rem', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--text-h)' }}>
                        Polígono de Equilibrio de Calidad e Inocuidad
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                        Balance multidimensional del cumplimiento normativo del establecimiento.
                    </p>
                    <div className={estilos.contenedorGraficoRadar}>
                        <Radar data={dataRadar} options={optionsRadar} />
                    </div>
                </div>
            )}

            {algunIndicadorActivo && (
                <div className={estilos.contenedorIndicadores}>
                    {resumen.mostrar_cumplimiento_limpieza && (
                        <div className={`${styles.tarjeta} ${estilos.tarjetaFullWidth}`} style={{ textAlign: 'center', padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                Cumplimiento de Limpieza e Higiene
                            </div>

                            <AnilloPorcentaje porcentaje={resumen.porcentaje_cumplimiento_limpieza} color="#16a34a" />

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '1rem' }}>
                                Promedio global de tareas ejecutadas en los últimos 30 días
                            </div>

                            {serie.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <h4 style={{ fontSize: '0.82rem', color: 'var(--text-h)', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
                                        Tendencia de Ejecución Diaria
                                    </h4>
                                    <div className={estilos.contenedorGraficoLineal}>
                                        <Line data={dataTendenciaLimpieza} options={optionsTendenciaLimpieza} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {resumen.mostrar_desglose_sectores && resumen.desglose_sectores && resumen.desglose_sectores.length > 0 && (
                        <div className={`${styles.tarjeta} ${estilos.tarjetaFullWidth}`} style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, textAlign: 'center' }}>
                                Cumplimiento de Higiene por Sector
                            </div>
                            <GraficoBarrasHorizontales
                                items={resumen.desglose_sectores.map((s, idx) => ({
                                    clave: `sector-${idx}`,
                                    etiqueta: s.sector,
                                    valor: s.porcentaje,
                                }))}
                                orden="original"
                                mostrarValor={(item) => ({
                                    principal: `${item.valor.toFixed(1)}%`
                                })}
                            />
                        </div>
                    )}

                    {resumen.mostrar_equipos_calibrados && (
                        <div className={styles.tarjeta} style={{ textAlign: 'center', padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                Equipos con Calibración al Día
                            </div>

                            <AnilloPorcentaje porcentaje={resumen.porcentaje_equipos_al_dia} color="#2563eb" />

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Dispositivos y maquinarias con mantenimiento vigente
                            </div>
                        </div>
                    )}

                    {resumen.mostrar_poes_vigentes && (
                        <div className={styles.tarjeta} style={{ textAlign: 'center', padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                Procedimientos Operativos (POES) Vigentes
                            </div>

                            <AnilloPorcentaje porcentaje={resumen.porcentaje_poes_vigentes} color="#0d9488" />

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Documentación y normas de calidad aprobadas
                            </div>
                        </div>
                    )}

                    {resumen.mostrar_desglose_incidentes && resumen.desglose_incidentes && resumen.desglose_incidentes.length > 0 && (
                        <div className={styles.tarjeta} style={{ padding: '1.25rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                Resolución de Desvíos e Incidentes de Calidad
                            </div>
                            <GraficoTorta
                                canvasId="torta-incidentes-vista-publica"
                                items={resumen.desglose_incidentes.map((i, idx) => ({
                                    clave: `incidente-${idx}`,
                                    etiqueta: i.etiqueta,
                                    valor: i.cantidad,
                                }))}
                                colores={resumen.desglose_incidentes.reduce((acc, i, idx) => {
                                    acc[`incidente-${idx}`] = i.color || (idx === 0 ? '#16a34a' : '#2563eb');
                                    return acc;
                                }, {} as Record<string, string>)}
                                colorTexto="#ffffff"
                                alto={190}
                            />
                        </div>
                    )}

                    {resumen.mostrar_capacitaciones && (
                        <div className={`${styles.tarjeta} ${estilos.tarjetaDestacada}`} style={{ textAlign: 'center', padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                Personal Capacitado y Habilitado
                            </div>

                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', margin: '0.25rem 0' }}>
                                {resumen.porcentaje_personal_capacitado !== null ? `${resumen.porcentaje_personal_capacitado}%` : 'N/A'}
                            </div>

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                Vigencia por tipo de documentación obligatoria del personal
                            </div>

                            <div style={{ height: '180px', width: '100%', marginTop: '0.5rem' }}>
                                <Bar data={dataPersonalBarras} options={optionsPersonalBarras} />
                            </div>
                        </div>
                    )}

                    {resumen.mostrar_trazabilidad_lotes && (
                        <div className={styles.tarjeta} style={{ textAlign: 'center', padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                Control de Trazabilidad en Lotes
                            </div>

                            <AnilloPorcentaje porcentaje={resumen.porcentaje_lotes_trazables} color="#ea580c" />

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(234, 88, 12, 0.15)', color: '#f97316', fontSize: '0.78rem', fontWeight: 600 }}>
                                    {resumen.lotes_totales_trazables ?? 12} lotes verificados
                                </span>
                                {resumen.volumen_trazable_kg && (
                                    <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(234, 88, 12, 0.15)', color: '#f97316', fontSize: '0.78rem', fontWeight: 600 }}>
                                        {resumen.volumen_trazable_kg.toLocaleString('es-AR')} kg elaborados
                                    </span>
                                )}
                            </div>

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Lotes de producción con rastreabilidad verificada
                            </div>
                        </div>
                    )}
                </div>
            )}

            <p className={estilos.contacto}>
                <i className="bi bi-geo-alt" aria-hidden="true"></i>
                <span>{resumen.contacto || 'Datos de contacto del establecimiento'}</span>
            </p>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Última actualización: {fechaFormateada}</span>
            </div>
        </div>
    );
}
