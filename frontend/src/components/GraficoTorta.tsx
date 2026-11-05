import { Pie } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Tooltip, type ChartType, type Plugin } from 'chart.js';

import type { ItemBarra } from './GraficoBarrasHorizontales';

const COLOR_ATENUADO = '#6c757c';
const TEXTO_SOBRE_ATENUADO = '#f0f2f4';
const COLOR_SEPARACION = '#0b0d0f';
const RADIO_ETIQUETA = 0.62;
const MARGEN_ETIQUETA = 10;
const FUENTE_NOMBRE = '600 12px system-ui, "Segoe UI", Roboto, sans-serif';
const FUENTE_PORCENTAJE = '700 13px system-ui, "Segoe UI", Roboto, sans-serif';

interface OpcionesEtiquetas {
    nombres: string[];
    porcentajes: number[];
    coloresTexto: string[];
}

const etiquetasInternas: Plugin<'pie', OpcionesEtiquetas> = {
    id: 'etiquetasInternas',
    afterDatasetsDraw(grafico, _argumentos, opciones) {
        const { ctx } = grafico;
        const arcos = grafico.getDatasetMeta(0).data;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        arcos.forEach((arco, indice) => {
            const porcentaje = opciones.porcentajes?.[indice] ?? 0;
            if (porcentaje === 0) return;

            const { x, y, startAngle, endAngle, outerRadius } = arco.getProps(
                ['x', 'y', 'startAngle', 'endAngle', 'outerRadius'],
                true,
            ) as { x: number; y: number; startAngle: number; endAngle: number; outerRadius: number };

            const apertura = endAngle - startAngle;
            const medio = startAngle + apertura / 2;
            const radio = outerRadius * RADIO_ETIQUETA;
            const px = x + Math.cos(medio) * radio;
            const py = y + Math.sin(medio) * radio;
            const disponible =
                apertura >= Math.PI
                    ? outerRadius
                    : Math.min(2 * radio * Math.sin(apertura / 2), outerRadius) - MARGEN_ETIQUETA;

            const nombre = opciones.nombres?.[indice] ?? '';
            const textoPorcentaje = `${porcentaje}%`;
            ctx.font = FUENTE_NOMBRE;
            const entraNombre = ctx.measureText(nombre).width <= disponible;
            ctx.font = FUENTE_PORCENTAJE;
            const entraPorcentaje = ctx.measureText(textoPorcentaje).width <= disponible;
            if (!entraPorcentaje) return;

            ctx.fillStyle = opciones.coloresTexto?.[indice] ?? '#111418';
            if (entraNombre) {
                ctx.font = FUENTE_NOMBRE;
                ctx.fillText(nombre, px, py - 8);
                ctx.font = FUENTE_PORCENTAJE;
                ctx.fillText(textoPorcentaje, px, py + 9);
            } else {
                ctx.fillText(textoPorcentaje, px, py);
            }
        });

        ctx.restore();
    },
};

ChartJS.register(ArcElement, Tooltip);

declare module 'chart.js' {
    interface PluginOptionsByType<TType extends ChartType> {
        etiquetasInternas?: TType extends 'pie' ? OpcionesEtiquetas : never;
    }
}

interface GraficoTortaProps {
    items: ItemBarra[];
    colores: Record<string, string>;
    colorTexto: string;
    seleccionado?: string | null;
    onSeleccionar?: (clave: string) => void;
    unidad?: (valor: number) => string;
    alto?: number;
}

export default function GraficoTorta({
    items,
    colores,
    colorTexto,
    seleccionado = null,
    onSeleccionar,
    unidad = (valor) => String(valor),
    alto = 280,
}: GraficoTortaProps) {
    const total = items.reduce((suma, item) => suma + item.valor, 0);
    const porcentajes = items.map((item) => (total > 0 ? Math.round((item.valor / total) * 100) : 0));
    const atenuado = (clave: string) => seleccionado !== null && seleccionado !== clave;

    return (
        <div style={{ position: 'relative', height: `${alto}px`, width: '100%' }}>
            <Pie
                data={{
                    labels: items.map((item) => item.etiqueta),
                    datasets: [
                        {
                            data: items.map((item) => item.valor),
                            backgroundColor: items.map((item) =>
                                atenuado(item.clave) ? COLOR_ATENUADO : colores[item.clave],
                            ),
                            offset: items.map((item) => (seleccionado === item.clave ? 10 : 0)),
                            borderColor: COLOR_SEPARACION,
                            borderWidth: 2,
                            hoverOffset: 6,
                        },
                    ],
                }}
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: 12 },
                    plugins: {
                        legend: { display: false },
                        etiquetasInternas: {
                            nombres: items.map((item) => item.etiqueta),
                            porcentajes,
                            coloresTexto: items.map((item) =>
                                atenuado(item.clave) ? TEXTO_SOBRE_ATENUADO : colorTexto,
                            ),
                        },
                        tooltip: {
                            callbacks: {
                                label: (contexto) => {
                                    const valor = Number(contexto.raw);
                                    return ` ${contexto.label}: ${unidad(valor)} (${porcentajes[contexto.dataIndex]}%)`;
                                },
                            },
                        },
                    },
                    onClick: (_evento, elementos) => {
                        if (elementos.length > 0 && onSeleccionar) {
                            onSeleccionar(items[elementos[0].index].clave);
                        }
                    },
                    onHover: (evento, elementos) => {
                        const objetivo = evento.native?.target as HTMLElement | undefined;
                        if (objetivo) objetivo.style.cursor = elementos.length > 0 && onSeleccionar ? 'pointer' : 'default';
                    },
                }}
                plugins={[etiquetasInternas]}
                aria-label={items.map((item) => `${item.etiqueta}: ${unidad(item.valor)}`).join(', ')}
                role="img"
            />
        </div>
    );
}
