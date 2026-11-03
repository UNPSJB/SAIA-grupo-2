import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';

import type { GraficoCumplimientoItem, GranularidadCumplimiento } from '../../types/tablero';
import { getGraficoCumplimiento } from '../../services/tableroServices';
import IndicadoresResumen from '../../components/IndicadoresResumen';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import estilos from '../../components/Estadisticas.module.css';
import styles from '../../styles/shared.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const COLOR_BARRA = '#4e96e2';
const COLOR_BARRA_EN_CURSO = 'rgba(78, 150, 226, 0.38)';
const COLOR_GRILLA = 'rgba(226, 232, 240, 0.08)';
const COLOR_TEXTO_EJE = '#8b939b';

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

function inicioDelMes(): string {
    const hoy = new Date();
    return fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
}

function aFecha(periodo: string): Date {
    const [anio, mes, dia] = periodo.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
}

function diaMes(fecha: Date): string {
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function finDeSemana(periodo: string): Date {
    const domingo = aFecha(periodo);
    domingo.setDate(domingo.getDate() + 6);
    return domingo;
}

function etiquetaCorta(periodo: string, granularidad: GranularidadCumplimiento): string {
    return granularidad === 'dia' ? diaMes(aFecha(periodo)) : `Sem. ${diaMes(aFecha(periodo))}`;
}

function etiquetaLarga(
    periodo: string,
    granularidad: GranularidadCumplimiento,
    limites?: { desde: string; hasta: string },
): string {
    const fecha = aFecha(periodo);
    if (granularidad === 'semana') {
        const inicio = limites && limites.desde > periodo ? aFecha(limites.desde) : fecha;
        const domingo = finDeSemana(periodo);
        const fin = limites && aFecha(limites.hasta) < domingo ? aFecha(limites.hasta) : domingo;
        return `Semana del ${diaMes(inicio)} al ${diaMes(fin)}`;
    }
    const texto = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatoPorcentaje(valor: number): string {
    return `${valor.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
}

const RANGOS = [
    { etiqueta: 'Últimos 7 días', desde: () => haceDias(6) },
    { etiqueta: 'Últimos 30 días', desde: () => haceDias(29) },
    { etiqueta: 'Últimos 90 días', desde: () => haceDias(89) },
    { etiqueta: 'Este mes', desde: inicioDelMes },
];

const GRANULARIDADES: { valor: GranularidadCumplimiento; etiqueta: string }[] = [
    { valor: 'dia', etiqueta: 'Por día' },
    { valor: 'semana', etiqueta: 'Por semana' },
];

interface Respuesta {
    clave: string;
    serie: GraficoCumplimientoItem[];
    error: boolean;
}

function GraficoBarras({
    serie,
    granularidad,
    enCurso,
    limites,
}: {
    serie: GraficoCumplimientoItem[];
    granularidad: GranularidadCumplimiento;
    enCurso: (item: GraficoCumplimientoItem) => boolean;
    limites: { desde: string; hasta: string };
}) {
    const resumenAccesible = serie
        .map((item) =>
            `${etiquetaLarga(item.periodo, granularidad, limites)}: ${
                item.porcentaje === null ? 'sin tareas programadas' : formatoPorcentaje(item.porcentaje)
            }`,
        )
        .join('; ');

    return (
        <div className={estilos.lienzoGrafico}>
            <Bar
                role="img"
                aria-label={resumenAccesible}
                data={{
                    labels: serie.map((item) => etiquetaCorta(item.periodo, granularidad)),
                    datasets: [
                        {
                            data: serie.map((item) => item.porcentaje),
                            backgroundColor: serie.map((item) => (enCurso(item) ? COLOR_BARRA_EN_CURSO : COLOR_BARRA)),
                            hoverBackgroundColor: serie.map((item) =>
                                enCurso(item) ? COLOR_BARRA_EN_CURSO : COLOR_BARRA,
                            ),
                            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                            borderSkipped: 'bottom',
                            maxBarThickness: 24,
                            categoryPercentage: 0.8,
                            barPercentage: 0.9,
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
                                title: (elementos) => {
                                    const item = serie[elementos[0].dataIndex];
                                    const titulo = etiquetaLarga(item.periodo, granularidad, limites);
                                    return enCurso(item) ? `${titulo} (en curso)` : titulo;
                                },
                                label: (contexto) => {
                                    const item = serie[contexto.dataIndex];
                                    if (item.porcentaje === null) return 'Sin tareas programadas';
                                    return `${formatoPorcentaje(item.porcentaje)} · ${item.realizadas} de ${item.esperadas} tareas`;
                                },
                            },
                        },
                    },
                    scales: {
                        y: {
                            min: 0,
                            max: 100,
                            border: { display: false },
                            grid: { color: COLOR_GRILLA },
                            ticks: { color: COLOR_TEXTO_EJE, stepSize: 25, callback: (valor) => `${valor}%` },
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
    );
}

export default function GraficoCumplimiento() {
    const hoy = fechaLocal(new Date());
    const [fechaDesde, setFechaDesde] = useState(() => haceDias(29));
    const [fechaHasta, setFechaHasta] = useState(hoy);
    const [granularidad, setGranularidad] = useState<GranularidadCumplimiento>('dia');
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

    const rangoValido = Boolean(fechaDesde && fechaHasta && fechaDesde <= fechaHasta);
    const clave = `${fechaDesde}|${fechaHasta}|${granularidad}`;
    const limites = { desde: fechaDesde, hasta: fechaHasta };

    useEffect(() => {
        if (!rangoValido) return;
        let cancelado = false;

        getGraficoCumplimiento(fechaDesde, fechaHasta, granularidad)
            .then((datos) => {
                if (!cancelado) setRespuesta({ clave, serie: datos.serie, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar el cumplimiento:', problema);
                if (!cancelado) setRespuesta({ clave, serie: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, [clave, fechaDesde, fechaHasta, granularidad, rangoValido]);

    const cargando = rangoValido && respuesta?.clave !== clave;
    const errorCarga = !cargando && respuesta?.error === true;
    const serie = !cargando && respuesta ? respuesta.serie : [];

    const enCurso = (item: GraficoCumplimientoItem) =>
        granularidad === 'dia' ? item.periodo === hoy : fechaLocal(finDeSemana(item.periodo)) >= hoy;

    const cerrados = serie.filter((item) => !enCurso(item) && item.porcentaje !== null);
    const hayEnCurso = serie.some((item) => enCurso(item) && item.porcentaje !== null);
    const esperadas = cerrados.reduce((suma, item) => suma + item.esperadas, 0);
    const realizadas = cerrados.reduce((suma, item) => suma + item.realizadas, 0);
    const ordenados = [...cerrados].sort((a, b) => (a.porcentaje ?? 0) - (b.porcentaje ?? 0));
    const peor = ordenados[0];
    const mejor = ordenados[ordenados.length - 1];
    const unidad = granularidad === 'dia' ? 'día' : 'semana';
    const aclaracion = hayEnCurso ? ` · sin contar ${granularidad === 'dia' ? 'hoy' : 'esta semana'}` : '';

    const aplicarRango = (desde: string) => {
        setFechaDesde(desde);
        setFechaHasta(hoy);
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <div className={estilos.pagina}>
                <EncabezadoPagina
                    titulo="Cumplimiento de Limpieza"
                    descripcion="Porcentaje de tareas de limpieza realizadas sobre las programadas, por día o por semana."
                    ancho="100%"
                />

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
                    <div className={estilos.rangos} role="group" aria-label="Rangos rápidos">
                        {RANGOS.map((rango) => {
                            const desde = rango.desde();
                            const activo = fechaDesde === desde && fechaHasta === hoy;
                            return (
                                <button
                                    key={rango.etiqueta}
                                    type="button"
                                    className={`${estilos.rango} ${activo ? estilos.rangoActivo : ''}`}
                                    aria-pressed={activo}
                                    onClick={() => aplicarRango(desde)}
                                >
                                    {rango.etiqueta}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {!rangoValido && (
                    <p className={estilos.aviso}>La fecha desde no puede ser posterior a la fecha hasta.</p>
                )}
                {errorCarga && <p className={estilos.aviso}>No se pudo cargar el cumplimiento.</p>}

                {rangoValido && !errorCarga && (
                    <>
                        <IndicadoresResumen
                            indicadores={[
                                {
                                    titulo: 'Cumplimiento del período',
                                    valor: cargando ? '…' : esperadas > 0 ? formatoPorcentaje(Math.round((realizadas / esperadas) * 1000) / 10) : '—',
                                    detalle: esperadas > 0 ? `${realizadas} de ${esperadas} tareas${aclaracion}` : 'Sin tareas programadas',
                                },
                                {
                                    titulo: `Mejor ${unidad}`,
                                    valor: cargando ? '…' : mejor ? formatoPorcentaje(mejor.porcentaje ?? 0) : '—',
                                    detalle: mejor ? etiquetaLarga(mejor.periodo, granularidad, limites) : 'Sin datos',
                                },
                                {
                                    titulo: `Peor ${unidad}`,
                                    valor: cargando ? '…' : peor ? formatoPorcentaje(peor.porcentaje ?? 0) : '—',
                                    detalle: peor ? etiquetaLarga(peor.periodo, granularidad, limites) : 'Sin datos',
                                },
                            ]}
                        />

                        <section className={estilos.tarjeta}>
                            <div className={estilos.tarjetaEncabezado}>
                                <h3>Cumplimiento {granularidad === 'dia' ? 'diario' : 'semanal'}</h3>
                                <div className={estilos.rangos} role="group" aria-label="Agrupar por">
                                    {GRANULARIDADES.map((opcion) => (
                                        <button
                                            key={opcion.valor}
                                            type="button"
                                            className={`${estilos.rango} ${granularidad === opcion.valor ? estilos.rangoActivo : ''}`}
                                            aria-pressed={granularidad === opcion.valor}
                                            onClick={() => setGranularidad(opcion.valor)}
                                        >
                                            {opcion.etiqueta}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {cargando ? (
                                <p className={estilos.vacio}>Cargando cumplimiento…</p>
                            ) : serie.every((item) => item.porcentaje === null) ? (
                                <p className={estilos.vacio}>No hay tareas de limpieza programadas en el período.</p>
                            ) : (
                                <>
                                    <GraficoBarras serie={serie} granularidad={granularidad} enCurso={enCurso} limites={limites} />
                                    <p className={estilos.notaGrafico}>
                                        Pasá el cursor por una barra para ver cuántas tareas se hicieron.
                                        {hayEnCurso &&
                                            ` ${granularidad === 'dia' ? 'Hoy' : 'Esta semana'} todavía está en curso: se muestra más claro y no cuenta en los indicadores.`}
                                    </p>

                                    <details className={estilos.datosTabla}>
                                        <summary>Ver los datos en una tabla</summary>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th scope="col">{granularidad === 'dia' ? 'Día' : 'Semana'}</th>
                                                    <th scope="col">Realizadas</th>
                                                    <th scope="col">Programadas</th>
                                                    <th scope="col">Cumplimiento</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {serie.map((item) => (
                                                    <tr key={item.periodo}>
                                                        <th scope="row">
                                                            {etiquetaLarga(item.periodo, granularidad, limites)}
                                                            {enCurso(item) && ' (en curso)'}
                                                        </th>
                                                        <td>{item.realizadas}</td>
                                                        <td>{item.esperadas}</td>
                                                        <td>{item.porcentaje === null ? '—' : formatoPorcentaje(item.porcentaje)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </details>
                                </>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
