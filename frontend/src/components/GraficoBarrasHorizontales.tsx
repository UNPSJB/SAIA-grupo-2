import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import styles from './Estadisticas.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export interface ItemBarra {
    clave: string;
    etiqueta: string;
    valor: number;
    detalle?: string;
}

interface ValorMostrado {
    principal: string;
    secundario?: string;
}

interface GraficoBarrasHorizontalesProps {
    items: ItemBarra[];
    seleccionado?: string | null;
    onSeleccionar?: (clave: string) => void;
    unidad?: (valor: number) => string;
    escala?: number;
    orden?: 'mayor' | 'menor' | 'original';
    mostrarValor?: (item: ItemBarra, total: number) => ValorMostrado;
    colores?: Record<string, string>;
    canvasId?: string;
}

const porDefecto = (item: ItemBarra, total: number): ValorMostrado => ({
    principal: String(item.valor),
    secundario: `${total > 0 ? Math.round((item.valor / total) * 100) : 0}%`,
});

export default function GraficoBarrasHorizontales({
    items,
    seleccionado = null,
    onSeleccionar,
    unidad,
    escala,
    orden = 'mayor',
    mostrarValor = porDefecto,
    colores,
    canvasId,
}: GraficoBarrasHorizontalesProps) {
    const total = items.reduce((suma, item) => suma + item.valor, 0);
    const maximo = escala ?? Math.max(...items.map((item) => item.valor), 0);
    const ordenados =
        orden === 'original'
            ? items
            : [...items].sort((a, b) => (orden === 'mayor' ? b.valor - a.valor : a.valor - b.valor));
    const interactivo = Boolean(onSeleccionar);

    return (
        <>
            <ul className={styles.barras}>
                {ordenados.map((item) => {
                    const ancho = maximo > 0 ? Math.min((item.valor / maximo) * 100, 100) : 0;
                    const activo = seleccionado === item.clave;
                    const atenuado = seleccionado !== null && !activo;
                    const valor = mostrarValor(item, total);
                    const descripcion = unidad ? unidad(item.valor) : valor.principal;
                    const contenido = (
                        <>
                            <span className={styles.etiqueta}>{item.etiqueta}</span>
                            <span className={styles.pista} aria-hidden="true">
                                <span
                                    className={`${styles.barra} ${atenuado ? styles.barraAtenuada : ''}`}
                                    style={{
                                        width: `${ancho}%`,
                                        ...(colores?.[item.clave] && !atenuado ? { background: colores[item.clave] } : {}),
                                    }}
                                />
                            </span>
                            <span className={styles.valor}>
                                <span className={styles.valorNumero}>{valor.principal}</span>
                                {valor.secundario && (
                                    <span className={styles.valorPorcentaje}>{valor.secundario}</span>
                                )}
                            </span>
                        </>
                    );

                    return (
                        <li key={item.clave}>
                            {interactivo ? (
                                <button
                                    type="button"
                                    className={`${styles.fila} ${activo ? styles.filaSeleccionada : ''}`}
                                    onClick={() => onSeleccionar?.(item.clave)}
                                    aria-pressed={activo}
                                    title={`${item.etiqueta}: ${descripcion}`}
                                >
                                    {contenido}
                                </button>
                            ) : (
                                <div className={`${styles.fila} ${styles.filaEstatica}`} title={`${item.etiqueta}: ${descripcion}`}>
                                    {contenido}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {canvasId && (
                <div id={canvasId} style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', height: `${Math.max(280, ordenados.length * 36)}px`, background: '#0f172a', padding: '16px', borderRadius: '8px' }}>
                    <Bar
                        data={{
                            labels: ordenados.map((item) => item.etiqueta),
                            datasets: [
                                {
                                    label: 'Valor',
                                    data: ordenados.map((item) => item.valor),
                                    backgroundColor: ordenados.map((item) => colores?.[item.clave] || '#3b82f6'),
                                    borderRadius: 4,
                                    maxBarThickness: 24,
                                },
                            ],
                        }}
                        options={{
                            indexAxis: 'y',
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                            },
                            scales: {
                                x: {
                                    beginAtZero: true,
                                    max: escala || undefined,
                                    grid: { color: 'rgba(226, 232, 240, 0.1)' },
                                    ticks: { color: '#94a3b8' },
                                },
                                y: {
                                    grid: { display: false },
                                    ticks: { color: '#f8fafc', font: { size: 12, weight: 600 } },
                                },
                            },
                        }}
                    />
                </div>
            )}
        </>
    );
}
