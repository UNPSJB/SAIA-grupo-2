import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ETIQUETA_FUENTE, ETIQUETA_NUTRIENTE } from '../features/datosNutricionales/nutrientes';
import { ETIQUETA_SELLO, RESULTADO } from '../features/parametrosNormativos/etiquetas';
import type { Nutriente } from '../types/datosNutricionales';
import type { ExportacionRotuloDetalle, RespaldoExportacion, SelloVista } from '../types/rotulos';

const MARGEN = 14;
const ANCHO_UTIL = 182;
const LIMITE_INFERIOR = 268;
const TINTA: [number, number, number] = [20, 20, 20];
const GRIS: [number, number, number] = [95, 95, 95];
const ROJO: [number, number, number] = [185, 28, 28];
const ENCABEZADO_TABLA: [number, number, number] = [45, 55, 72];

type Doc = jsPDF & { lastAutoTable?: { finalY: number } };

const REEMPLAZOS: [RegExp, string][] = [
    [/≥/g, '>='],
    [/≤/g, '<='],
    [/[“”]/g, '"'],
    [/[‘’]/g, "'"],
    [/…/g, '...'],
];

function limpiar(texto: string): string {
    return REEMPLAZOS.reduce((acumulado, [patron, reemplazo]) => acumulado.replace(patron, reemplazo), texto);
}

function texto(valor: unknown, alternativo = 'Sin completar'): string {
    if (valor === null || valor === undefined || valor === '') return alternativo;
    return limpiar(String(valor));
}

function numero(valor: number | null | undefined, decimales = 2): string {
    if (valor === null || valor === undefined) return '-';
    return valor.toLocaleString('es-AR', { maximumFractionDigits: decimales });
}

function fecha(valor: string | null | undefined): string {
    if (!valor) return 'Sin completar';
    const [anio, mes, dia] = valor.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
}

function fechaHora(valor: string): string {
    const momento = new Date(valor);
    if (Number.isNaN(momento.getTime())) return valor;
    return momento.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function nutriente(valor: string): string {
    return ETIQUETA_NUTRIENTE[valor as Nutriente] ?? valor.replace(/_/g, ' ');
}

function asegurarEspacio(doc: Doc, y: number, alto: number): number {
    if (y + alto <= LIMITE_INFERIOR) return y;
    doc.addPage();
    return 22;
}

function titulo(doc: Doc, contenido: string, y: number, tamano = 13): number {
    y = asegurarEspacio(doc, y, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(tamano);
    doc.setTextColor(...TINTA);
    doc.text(limpiar(contenido), MARGEN, y);
    doc.setDrawColor(160);
    doc.line(MARGEN, y + 1.8, MARGEN + ANCHO_UTIL, y + 1.8);
    return y + 8;
}

function parrafo(doc: Doc, contenido: string, y: number, opciones: { negrita?: boolean; tamano?: number; color?: [number, number, number] } = {}): number {
    doc.setFont('helvetica', opciones.negrita ? 'bold' : 'normal');
    doc.setFontSize(opciones.tamano ?? 9);
    doc.setTextColor(...(opciones.color ?? TINTA));
    const lineas: string[] = doc.splitTextToSize(limpiar(contenido), ANCHO_UTIL);
    const alto = (opciones.tamano ?? 9) * 0.42;
    lineas.forEach((linea) => {
        y = asegurarEspacio(doc, y, alto);
        doc.text(linea, MARGEN, y);
        y += alto;
    });
    return y + 1.5;
}

function campos(doc: Doc, filas: [string, string][], y: number): number {
    autoTable(doc, {
        startY: y,
        body: filas.map(([etiqueta, valor]) => [etiqueta, limpiar(valor)]),
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 0.8, bottom: 0.8, left: 0, right: 2 }, textColor: TINTA },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 } },
        margin: { left: MARGEN, right: MARGEN, bottom: 24 },
        didParseCell: (celda) => {
            if (celda.column.index === 1 && String(celda.cell.raw).includes('Sin completar')) {
                celda.cell.styles.textColor = ROJO;
                celda.cell.styles.fontStyle = 'italic';
            }
        },
    });
    return (doc.lastAutoTable?.finalY ?? y) + 4;
}

function tabla(
    doc: Doc,
    encabezados: string[],
    filas: string[][],
    y: number,
    alineaDerecha: number[] = [],
    relleno = 1.6,
): number {
    const cuerpo = filas.length > 0 ? filas : [[ 'Sin datos', ...encabezados.slice(1).map(() => '') ]];
    const columnStyles = Object.fromEntries(alineaDerecha.map((indice) => [indice, { halign: 'right' as const }]));
    autoTable(doc, {
        startY: y,
        head: [encabezados],
        body: cuerpo.map((fila) => fila.map(limpiar)),
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, cellPadding: relleno, overflow: 'linebreak', textColor: TINTA, lineColor: 170 },
        headStyles: { fillColor: ENCABEZADO_TABLA, textColor: 255, fontStyle: 'bold' },
        columnStyles,
        margin: { left: MARGEN, right: MARGEN, bottom: 24 },
        rowPageBreak: 'avoid',
    });
    return (doc.lastAutoTable?.finalY ?? y) + 6;
}

function lineasSello(textoSello: string): string[] {
    const palabras = limpiar(textoSello).toUpperCase().split(/\s+/);
    if (palabras.length > 2 && palabras[0] === 'EXCESO' && palabras[1] === 'EN') {
        const resto = palabras.slice(2);
        return ['EXCESO EN', ...(resto.length > 1 ? [resto[0], resto.slice(1).join(' ')] : resto)];
    }
    return palabras;
}

function octogono(doc: Doc, centroX: number, centroY: number, radio: number, contenido: string): void {
    const puntos: [number, number][] = [];
    for (let i = 0; i < 8; i += 1) {
        const angulo = Math.PI / 8 + (i * Math.PI) / 4;
        puntos.push([centroX + radio * Math.cos(angulo), centroY + radio * Math.sin(angulo)]);
    }
    const tramos = puntos.slice(1).map(([x, y], i) => [x - puntos[i][0], y - puntos[i][1]]);
    doc.setFillColor(0, 0, 0);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.lines(tramos, puntos[0][0], puntos[0][1], [1, 1], 'FD', true);
    doc.setLineWidth(0.2);

    const lineas = lineasSello(contenido);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.6);
    const alto = 2.4;
    const inicio = centroY - ((lineas.length - 1) * alto) / 2 + 0.8;
    lineas.forEach((linea, indice) => {
        doc.text(linea, centroX, inicio + indice * alto, { align: 'center' });
    });
    doc.setFontSize(3.6);
    doc.text('MINISTERIO', centroX, centroY + radio * 0.6, { align: 'center' });
    doc.text('DE SALUD', centroX, centroY + radio * 0.6 + 1.5, { align: 'center' });
}

function leyendaPrecautoria(doc: Doc, x: number, y: number, ancho: number, contenido: string): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const lineas: string[] = doc.splitTextToSize(limpiar(contenido).toUpperCase(), ancho - 4);
    const alto = lineas.length * 2.9 + 3;
    doc.setFillColor(0, 0, 0);
    doc.rect(x, y, ancho, alto, 'F');
    doc.setTextColor(255, 255, 255);
    lineas.forEach((linea, indice) => doc.text(linea, x + ancho / 2, y + 4 + indice * 2.9, { align: 'center' }));
    return alto;
}

function recuadroLeyenda(doc: Doc, leyenda: string, y: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const lineas: string[] = doc.splitTextToSize(limpiar(leyenda), ANCHO_UTIL - 8);
    const alto = lineas.length * 4.6 + 4;
    doc.setFillColor(...ROJO);
    doc.rect(MARGEN, y, ANCHO_UTIL, alto, 'F');
    doc.setTextColor(255, 255, 255);
    lineas.forEach((linea, indice) => doc.text(linea, MARGEN + ANCHO_UTIL / 2, y + 5.6 + indice * 4.6, { align: 'center' }));
    return y + alto + 6;
}

function recuadroAdvertencias(doc: Doc, respaldo: RespaldoExportacion, y: number): number {
    const { faltantes, advertencias } = respaldo.borrador;
    if (faltantes.length === 0 && advertencias.length === 0) return y;

    const lineas = [
        ...(faltantes.length > 0 ? ['Faltan datos obligatorios:', ...faltantes.map((f) => `- ${f}`)] : []),
        ...(advertencias.length > 0 ? ['Advertencias:', ...advertencias.map((a) => `- ${a}`)] : []),
    ];
    doc.setFontSize(8.5);
    const partidas = lineas.flatMap((linea) => doc.splitTextToSize(limpiar(linea), ANCHO_UTIL - 8) as string[]);
    const alto = partidas.length * 3.8 + 10;
    y = asegurarEspacio(doc, y, alto);
    doc.setDrawColor(217, 119, 6);
    doc.setFillColor(254, 243, 199);
    doc.setLineWidth(0.6);
    doc.rect(MARGEN, y, ANCHO_UTIL, alto, 'FD');
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14);
    doc.text('Revisar antes de usar este borrador', MARGEN + 4, y + 5.5);
    doc.setFontSize(8.5);
    partidas.forEach((linea, indice) => {
        const esTitulo = linea === 'Faltan datos obligatorios:' || linea === 'Advertencias:';
        doc.setFont('helvetica', esTitulo ? 'bold' : 'normal');
        doc.text(linea, MARGEN + 4, y + 10.5 + indice * 3.8);
    });
    return y + alto + 6;
}

function caraPrincipal(doc: Doc, respaldo: RespaldoExportacion, y: number): number {
    const cara = respaldo.borrador.cara_principal;
    const sellos: SelloVista[] = cara.sellos;
    const leyendas: SelloVista[] = cara.leyendas;
    const altoSellos = sellos.length > 0 ? 28 : 0;
    const altoLeyendas = leyendas.length * 10;
    const alto = 33 + altoSellos + altoLeyendas + (cara.motivo && sellos.length === 0 ? 8 : 0);

    y = asegurarEspacio(doc, y, alto + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text('CARA PRINCIPAL', MARGEN + 2, y + 4);
    doc.setDrawColor(150);
    doc.setLineDashPattern([1.5, 1.2], 0);
    doc.rect(MARGEN, y, ANCHO_UTIL, alto);
    doc.setLineDashPattern([], 0);

    let cursor = y + 7;
    if (sellos.length > 0) {
        const radio = 12.5;
        const separacion = 27;
        const inicio = MARGEN + ANCHO_UTIL / 2 - ((sellos.length - 1) * separacion) / 2;
        sellos.forEach((sello, indice) => octogono(doc, inicio + indice * separacion, cursor + radio + 1, radio, sello.texto));
        cursor += altoSellos;
    }
    leyendas.forEach((leyenda) => {
        cursor += leyendaPrecautoria(doc, MARGEN + ANCHO_UTIL / 2 - 45, cursor, 90, leyenda.texto) + 2;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...(cara.denominacion_venta ? TINTA : ROJO));
    doc.text(texto(cara.denominacion_venta, 'Denominación de venta sin completar'), MARGEN + ANCHO_UTIL / 2, cursor + 9, {
        align: 'center',
        maxWidth: ANCHO_UTIL - 10,
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(limpiar(respaldo.borrador.producto.nombre), MARGEN + ANCHO_UTIL / 2, cursor + 15, { align: 'center' });
    cursor += 15;

    if (cara.motivo && sellos.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(...TINTA);
        doc.text(limpiar(cara.motivo), MARGEN + ANCHO_UTIL / 2, cursor + 6, { align: 'center', maxWidth: ANCHO_UTIL - 10 });
        cursor += 8;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const neto = cara.contenido_neto !== null
        ? `Contenido neto ${numero(cara.contenido_neto)} ${cara.unidad_contenido_neto ?? ''}`.trim()
        : 'Contenido neto: sin completar';
    doc.setTextColor(...(cara.contenido_neto !== null ? TINTA : ROJO));
    doc.text(neto, MARGEN + ANCHO_UTIL / 2, y + alto - 5, { align: 'center' });

    return y + alto + 7;
}

function informacion(doc: Doc, respaldo: RespaldoExportacion, y: number): number {
    const vista = respaldo.borrador;
    y = titulo(doc, 'Información obligatoria', y, 11);
    y = parrafo(doc, texto(vista.lista_ingredientes, 'Lista de ingredientes sin completar'), y, {
        color: vista.lista_ingredientes ? TINTA : ROJO,
    });
    if (vista.alergenos.contiene) y = parrafo(doc, vista.alergenos.contiene, y, { negrita: true });
    if (vista.alergenos.puede_contener) y = parrafo(doc, vista.alergenos.puede_contener, y, { negrita: true });

    const filas: [string, string][] = [
        ['Elaborado por', `${texto(vista.origen.razon_social)} - ${texto(vista.origen.domicilio)}`],
    ];
    if (vista.origen.es_importado) {
        filas.push(
            ['Importado por', `${texto(vista.origen.razon_social_importador)} - ${texto(vista.origen.domicilio_importador)}`],
            ['País de origen', texto(vista.origen.pais_origen)],
        );
    }
    filas.push(
        ['RNPA / RPPA', texto(vista.origen.rnpa_rppa)],
        ['Lote', vista.lote ? String(vista.lote.nro_lote) : 'Sin completar'],
        ['Consumir antes de', vista.lote?.fecha_duracion ? fecha(vista.lote.fecha_duracion) : 'Sin completar'],
    );
    if (vista.conservacion) filas.push(['Conservación', vista.conservacion]);
    if (vista.instrucciones_uso) filas.push(['Preparación e instrucciones de uso', vista.instrucciones_uso]);
    y = campos(doc, filas, y + 1);

    const tablaVista = vista.tabla_nutricional;
    if (!tablaVista) {
        return parrafo(doc, 'Información nutricional sin datos: el producto no tiene receta vigente.', y, { color: ROJO });
    }
    const base = vista.producto.tipo === 'bebida' ? '100 ml' : '100 g';
    const unidad = vista.producto.tipo === 'bebida' ? 'ml' : 'g';
    y = asegurarEspacio(doc, y, 60);
    y = parrafo(
        doc,
        `INFORMACIÓN NUTRICIONAL - Porción ${numero(tablaVista.porcion_gramos)} ${unidad}${tablaVista.medida_casera ? ` (${tablaVista.medida_casera})` : ''}`,
        y,
        { negrita: true },
    );
    y = tabla(
        doc,
        ['', `Cantidad por ${base}`, 'Cantidad por porción', '% VD (*)'],
        tablaVista.filas.map((fila) => [fila.subnivel ? `   ${fila.nombre}` : fila.nombre, fila.valor_100g, fila.valor_porcion, fila.porcentaje_vd]),
        y - 1,
        [1, 2, 3],
        0.9,
    );
    y = parrafo(doc, tablaVista.nota_pie, y - 3, { tamano: 7, color: GRIS });
    if (tablaVista.estado === 'incompleta') {
        y = parrafo(doc, `TABLA INCOMPLETA: faltan datos de ${tablaVista.insumos_sin_datos.join(', ')}.`, y, { negrita: true, color: ROJO });
    }
    return y;
}

function anexoReceta(doc: Doc, respaldo: RespaldoExportacion, y: number): number {
    y = titulo(doc, 'Anexo A. Receta', y);
    const receta = respaldo.receta;
    if (!receta) return parrafo(doc, 'El borrador no tiene una versión de receta asociada.', y, { color: ROJO });
    y = campos(
        doc,
        [
            ['Versión', `${receta.version} (${receta.estado === 'activo' ? 'vigente' : 'archivada'})`],
            ['Vigente desde', receta.fecha_vigencia ? fecha(receta.fecha_vigencia) : '-'],
            ['Rendimiento final', `${numero(receta.rendimiento_final_gramos)} g`],
            ['Porción', `${numero(receta.unidad_venta_gramos)} g${receta.medida_casera ? ` (${receta.medida_casera})` : ''}`],
            ...(receta.motivo_cambio ? [['Motivo del cambio', receta.motivo_cambio] as [string, string]] : []),
        ],
        y,
    );
    return tabla(
        doc,
        ['#', 'Insumo', 'Cantidad', 'Unidad', 'Gramos', 'Uso'],
        receta.renglones.map((renglon) => [
            String(renglon.renglon),
            renglon.insumo,
            numero(renglon.cantidad_original, 3),
            renglon.unidad ?? '-',
            numero(renglon.cantidad_gramos),
            renglon.aditivo
                ? `Aditivo: ${renglon.aditivo.funcion ?? ''} ${renglon.aditivo.nombre}${renglon.aditivo.numero_ins ? ` (INS ${renglon.aditivo.numero_ins})` : ''}`.trim()
                : 'Ingrediente',
        ]),
        y,
        [0, 2, 4],
    );
}

function anexoComposicion(doc: Doc, respaldo: RespaldoExportacion, y: number): number {
    y = titulo(doc, 'Anexo B. Composición porcentual', y);
    const composicion = respaldo.composicion;
    if (!composicion) return parrafo(doc, 'Sin composición: el borrador no tiene receta asociada.', y, { color: ROJO });
    const filas = [...composicion.ingredientes, ...composicion.aditivos].map((item) => [
        item.nombre_insumo,
        item.tipo_uso === 'aditivo' ? 'Aditivo' : 'Ingrediente',
        numero(item.cantidad_gramos),
        `${numero(item.porcentaje)} %`,
    ]);
    filas.push(['Total', '', numero(composicion.total_gramos), `${numero(composicion.suma_porcentajes)} %`]);
    return tabla(doc, ['Componente', 'Tipo', 'Gramos', 'Porcentaje'], filas, y, [2, 3]);
}

function anexoTabla(doc: Doc, respaldo: RespaldoExportacion, y: number): number {
    y = titulo(doc, 'Anexo C. Tabla nutricional y fuentes de datos', y);
    const calculo = respaldo.tabla_nutricional.calculo;
    if (!calculo) return parrafo(doc, 'Sin tabla nutricional: el borrador no tiene receta asociada.', y, { color: ROJO });

    y = parrafo(
        doc,
        `Cálculo sobre la versión ${calculo.version} de la receta. Porción de ${numero(calculo.unidad_venta_gramos)} g. ` +
            'Valores sin redondear y valores expresados según la configuración de la tabla.',
        y,
    );
    y = tabla(
        doc,
        ['Nutriente', 'Por 100 g (calculado)', 'Por 100 g (expresado)', 'Por porción (calculado)', 'Por porción (expresado)', '% VD'],
        calculo.items.map((item) => [
            nutriente(item.nutriente),
            numero(item.valor_100g_raw, 3),
            item.valor_100g_expresado,
            numero(item.valor_porcion_raw, 3),
            item.valor_porcion_expresado,
            item.porcentaje_vd_expresado,
        ]),
        y,
        [1, 2, 3, 4, 5],
    );
    if (calculo.estado === 'incompleta') {
        y = parrafo(doc, `Tabla incompleta. Insumos sin datos: ${calculo.faltantes.map((f) => f.insumo_nombre).join(', ')}.`, y, {
            negrita: true,
            color: ROJO,
        });
    }

    y = parrafo(doc, 'Fuentes de los datos nutricionales de cada insumo (valores por 100 g del insumo):', y, { negrita: true });
    const filas = respaldo.tabla_nutricional.fuentes.flatMap((fuente) =>
        fuente.datos.length === 0
            ? [[fuente.insumo, 'Sin datos cargados', '', '', '']]
            : fuente.datos.map((dato) => [
                  fuente.insumo,
                  nutriente(dato.nutriente),
                  numero(dato.valor_100g, 3),
                  `${ETIQUETA_FUENTE[dato.fuente] ?? dato.fuente}${dato.modificado ? ' (modificado)' : ''}`,
                  dato.referencia ?? '-',
              ]),
    );
    return tabla(doc, ['Insumo', 'Nutriente', 'Valor', 'Fuente', 'Referencia'], filas, y, [2]);
}

function anexoSellos(doc: Doc, respaldo: RespaldoExportacion, y: number): number {
    y = titulo(doc, 'Anexo D. Cálculo de sellos de advertencia', y);
    const calculo = respaldo.calculo_sellos;
    const cara = respaldo.borrador.cara_principal;
    if (!calculo) {
        return parrafo(doc, cara.motivo ?? 'El borrador no tiene un cálculo de sellos asociado.', y);
    }
    const obtenidos = [...calculo.sellos_obtenidos, ...calculo.leyendas_obtenidas];
    y = campos(
        doc,
        [
            ['Aplicabilidad', RESULTADO[calculo.resultado_aplicabilidad]?.titulo ?? calculo.resultado_aplicabilidad],
            ['Parámetros normativos', `Versión ${calculo.parametros.version}, vigente desde el ${fecha(calculo.parametros.fecha_vigencia)}`],
            ['Norma de origen', calculo.parametros.norma_origen],
            ['Versión de receta', calculo.version_receta !== null && calculo.version_receta !== undefined ? String(calculo.version_receta) : '-'],
            ['Fecha del cálculo', calculo.fecha_calculo ? fechaHora(calculo.fecha_calculo) : '-'],
            ['Estado', calculo.provisorio ? 'Provisorio (tabla nutricional incompleta)' : 'Definitivo'],
            ['Resultado', obtenidos.length > 0 ? obtenidos.map((s) => s.texto).join(' / ') : 'Sin sellos ni leyendas'],
        ],
        y,
    );
    return tabla(
        doc,
        ['Sello', 'Evaluado', 'Cálculo', 'Supera'],
        calculo.pasos_calculo.map((paso) => [
            ETIQUETA_SELLO[paso.sello] ?? paso.sello,
            paso.evaluado ? 'Sí' : 'No',
            paso.evaluado ? paso.formula_desplegada : paso.motivo_no_evaluado ?? paso.formula_desplegada,
            paso.evaluado ? (paso.supera_umbral ? 'Sí' : 'No') : '-',
        ]),
        y,
    );
}

function pieDePagina(doc: Doc, exportacion: ExportacionRotuloDetalle): void {
    const total = doc.getNumberOfPages();
    const leyenda = limpiar(exportacion.respaldo_snapshot.leyenda_borrador);
    for (let pagina = 1; pagina <= total; pagina += 1) {
        doc.setPage(pagina);
        const alto = doc.internal.pageSize.getHeight();
        doc.setDrawColor(190);
        doc.line(MARGEN, alto - 22, MARGEN + ANCHO_UTIL, alto - 22);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...ROJO);
        const lineas: string[] = doc.splitTextToSize(leyenda, ANCHO_UTIL);
        lineas.forEach((linea, indice) => doc.text(linea, MARGEN, alto - 17.5 + indice * 3.2));
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...GRIS);
        doc.text(
            `Exportación N.º ${exportacion.id} - ${fechaHora(exportacion.fecha_exportacion)} - Receta versión ${exportacion.version_receta ?? '-'}`,
            MARGEN,
            alto - 8,
        );
        doc.text(`Página ${pagina} de ${total}`, MARGEN + ANCHO_UTIL, alto - 8, { align: 'right' });
    }
}

function nombreArchivo(exportacion: ExportacionRotuloDetalle): string {
    const base = exportacion.respaldo_snapshot.borrador.producto.nombre
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
    return `borrador-rotulo-${base || 'producto'}-exportacion-${exportacion.id}.pdf`;
}

export function generarRotuloPdf(exportacion: ExportacionRotuloDetalle): jsPDF {
    const doc: Doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const respaldo = exportacion.respaldo_snapshot;
    const generadoPor = [exportacion.empleado_nombre, exportacion.empleado_apellido].filter(Boolean).join(' ');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...TINTA);
    doc.text(limpiar(`Borrador de rótulo - ${respaldo.borrador.producto.nombre}`), MARGEN, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text(
        limpiar(
            `Exportación N.º ${exportacion.id} - Generado el ${fechaHora(exportacion.fecha_exportacion)}` +
                `${generadoPor ? ` por ${generadoPor}` : ''} - Receta versión ${exportacion.version_receta ?? '-'}` +
                ` - Parámetros normativos versión ${exportacion.version_parametros ?? '-'}`,
        ),
        MARGEN,
        24,
        { maxWidth: ANCHO_UTIL },
    );

    let y = recuadroLeyenda(doc, respaldo.leyenda_borrador, 30);
    y = recuadroAdvertencias(doc, respaldo, y);
    y = caraPrincipal(doc, respaldo, y);
    informacion(doc, respaldo, y);

    doc.addPage();
    y = titulo(doc, 'Anexo de respaldo de cálculo', 22, 15);
    y = parrafo(
        doc,
        'Datos con los que se armó este borrador: receta, composición porcentual, tabla nutricional con las fuentes de datos ' +
            'y cálculo de sellos con la versión de parámetros normativos utilizada.',
        y,
        { color: GRIS },
    );
    y = anexoReceta(doc, respaldo, y + 2);
    y = anexoComposicion(doc, respaldo, y);
    y = anexoTabla(doc, respaldo, y);
    anexoSellos(doc, respaldo, y);

    pieDePagina(doc, exportacion);
    return doc;
}

export function exportarRotuloPdf(exportacion: ExportacionRotuloDetalle): void {
    generarRotuloPdf(exportacion).save(nombreArchivo(exportacion));
}
