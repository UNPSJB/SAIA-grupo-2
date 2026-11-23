
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { ExportacionRotuloDetalle } from '../types/rotulos';

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function obtenerRegistro(
    registro: Registro | null,
    clave: string,
): Registro | null {
    const valor = registro?.[clave];
    return esRegistro(valor) ? valor : null;
}

function obtenerLista(
    registro: Registro | null,
    clave: string,
): Registro[] {
    const valor = registro?.[clave];

    if (!Array.isArray(valor)) return [];

    return valor.filter(esRegistro);
}

function valorTexto(valor: unknown, alternativo = '—'): string {
    if (valor === null || valor === undefined || valor === '') {
        return alternativo;
    }

    if (typeof valor === 'object') {
        return JSON.stringify(valor);
    }

    return String(valor);
}

function obtenerTexto(
    registro: Registro | null,
    clave: string,
    alternativo = '—',
): string {
    return valorTexto(registro?.[clave], alternativo);
}

function formatearFecha(fecha: unknown): string {
    if (!fecha) return 'No disponible';

    const valor = new Date(String(fecha));

    if (Number.isNaN(valor.getTime())) {
        return String(fecha);
    }

    return valor.toLocaleString('es-AR');
}

function obtenerNombreNutriente(valor: unknown): string {
    const nombre = String(valor ?? '').trim();

    const nombres: Record<string, string> = {
        energia: 'Energía',
        carbohidratos: 'Carbohidratos',
        azucares_totales: 'Azúcares totales',
        azucares_anadidos: 'Azúcares añadidos',
        proteinas: 'Proteínas',
        grasas_totales: 'Grasas totales',
        grasas_saturadas: 'Grasas saturadas',
        grasas_trans: 'Grasas trans',
        fibra_alimentaria: 'Fibra alimentaria',
        sodio: 'Sodio',
    };

    return nombres[nombre.toLowerCase()] ??
        nombre.replace(/_/g, ' ');
}

function agregarSeccion(
    doc: jsPDF,
    titulo: string,
    y: number,
): number {
    if (y > 255) {
        doc.addPage();
        y = 25;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(35, 50, 65);
    doc.text(titulo, 14, y);

    doc.setDrawColor(150);
    doc.line(14, y + 2, 196, y + 2);

    return y + 9;
}

function agregarCampo(
    doc: jsPDF,
    etiqueta: string,
    valor: unknown,
    y: number,
): number {
    const texto = valorTexto(valor);
    const anchoEtiqueta = 48;
    const anchoValor = 131;
    const altoLinea = 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    const etiquetaEnLinea = doc.splitTextToSize(
        etiqueta,
        anchoEtiqueta,
    );

    // Las etiquetas largas se muestran encima del valor.
    if (etiquetaEnLinea.length > 1) {
        const lineasEtiqueta = doc.splitTextToSize(
            `${etiqueta}:`,
            178,
        );

        lineasEtiqueta.forEach((linea: string) => {
            if (y > 275) {
                doc.addPage();
                y = 25;
            }

            doc.setFont('helvetica', 'bold');
            doc.text(linea, 14, y);
            y += altoLinea;
        });

        const lineasValor = doc.splitTextToSize(texto, 178);

        doc.setFont('helvetica', 'normal');

        lineasValor.forEach((linea: string) => {
            if (y > 275) {
                doc.addPage();
                y = 25;
            }

            doc.text(linea, 14, y);
            y += altoLinea;
        });

        return y + 1;
    }

    // Las etiquetas cortas mantienen el formato horizontal.
    if (y > 275) {
        doc.addPage();
        y = 25;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`${etiqueta}:`, 14, y);

    const lineasValor = doc.splitTextToSize(
        texto,
        anchoValor,
    );

    doc.setFont('helvetica', 'normal');

    lineasValor.forEach((linea: string, indice: number) => {
        if (y > 275) {
            doc.addPage();
            y = 25;
        }

        doc.text(
            linea,
            indice === 0 ? 65 : 65,
            y,
        );

        if (indice < lineasValor.length - 1) {
            y += altoLinea;
        }
    });

    return y + 6;
}

function agregarTabla(
    doc: jsPDF,
    encabezados: string[],
    filas: string[][],
    y: number,
): number {
    const cuerpo = filas.length > 0
        ? filas
        : [encabezados.map((_, indice) =>
            indice === 0 ? 'Sin datos disponibles' : '',
        )];

    autoTable(doc, {
        startY: y,
        head: [encabezados],
        body: cuerpo,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: [55, 75, 95],
            textColor: 255,
            fontStyle: 'bold',
        },
        margin: {
            left: 14,
            right: 14,
            bottom: 20,
        },
        rowPageBreak: 'avoid',
    });

    return (doc as jsPDF & {
        lastAutoTable?: { finalY: number };
    }).lastAutoTable?.finalY ?? y + 10;
}

function agregarPieYMarca(doc: jsPDF, fecha: string): void {
    const totalPaginas = doc.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
        doc.setPage(pagina);

        const alto = doc.internal.pageSize.getHeight();
        const ancho = doc.internal.pageSize.getWidth();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(180, 35, 35);
        doc.text('BORRADOR', ancho - 14, 12, { align: 'right' });

        doc.setDrawColor(190);
        doc.line(14, alto - 15, ancho - 14, alto - 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(90);
        doc.text(`Exportado: ${fecha}`, 14, alto - 9);
        doc.text(
            `Página ${pagina} de ${totalPaginas}`,
            ancho - 14,
            alto - 9,
            { align: 'right' },
        );
    }
}

export function exportarRotuloPdf(
    exportacion: ExportacionRotuloDetalle,
): void {
    const doc = new jsPDF();
    const respaldo = exportacion.respaldo_snapshot;

    const rotulo = obtenerRegistro(respaldo, 'rotulo');
    const receta = obtenerRegistro(respaldo, 'receta');
    const completitud = obtenerRegistro(respaldo, 'completitud');
    const calculoSellos = obtenerRegistro(respaldo, 'calculo_sellos');

    const ingredientesSnapshot = obtenerRegistro(
        rotulo,
        'ingredientes_snapshot',
    );
    const nutricionSnapshot = obtenerRegistro(
        rotulo,
        'nutricion_snapshot',
    );

    const ingredientes = obtenerLista(ingredientesSnapshot, 'ingredientes');
    const aditivos = obtenerLista(ingredientesSnapshot, 'aditivos');
    const nutrientes = obtenerLista(nutricionSnapshot, 'items');
    const lotes = obtenerLista(respaldo, 'lotes');

    const sellos = Array.isArray(rotulo?.sellos_snapshot)
        ? rotulo.sellos_snapshot
        : [];

    const faltantes = Array.isArray(completitud?.faltantes)
        ? completitud.faltantes.map((item) => String(item))
        : [];

    const fecha = formatearFecha(exportacion.fecha_exportacion);
    const completo = completitud?.completo === true;

    let y = 20;

    // Portada e identificación del borrador.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(35, 50, 65);
    doc.text('BORRADOR DE RÓTULO', 14, y);

    y += 9;

    doc.setFontSize(10);
    doc.setTextColor(180, 35, 35);
    doc.text(
        completo
            ? 'DOCUMENTO DE TRABAJO - NO APROBADO'
            : 'BORRADOR - INFORMACIÓN INCOMPLETA',
        14,
        y,
    );

    y += 9;

    doc.setTextColor(50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    y = agregarCampo(doc, 'Exportación N.º', exportacion.id, y);
    y = agregarCampo(doc, 'Fecha de exportación', fecha, y);
    y = agregarCampo(
        doc,
        'Producto',
        obtenerTexto(rotulo, 'denominacion_venta'),
        y,
    );

    if (!completo) {
        y = agregarSeccion(doc, 'Información pendiente', y + 3);

        faltantes.forEach((faltante) => {
            y = agregarCampo(doc, 'Pendiente', faltante, y);
        });

        if (faltantes.length === 0) {
            y = agregarCampo(
                doc,
                'Estado',
                'No se dispone del detalle de los datos pendientes.',
                y,
            );
        }
    }

    // Datos comerciales y legales.
    y = agregarSeccion(doc, '1. Datos del rótulo', y + 5);

    const camposRotulo: [string, unknown][] = [
        ['Denominación de venta', rotulo?.denominacion_venta],
        [
            'Contenido neto',
            rotulo?.contenido_neto !== null &&
            rotulo?.contenido_neto !== undefined
                ? `${rotulo.contenido_neto} ${valorTexto(rotulo.unidad_contenido_neto, '')}`.trim()
                : null,
        ],
        ['RNPA / RPPA', rotulo?.rnpa_rppa],
        ['Razón social', rotulo?.razon_social],
        ['Domicilio', rotulo?.domicilio],
        ['Producto importado', rotulo?.es_importado ? 'Sí' : 'No'],
    ];

    if (rotulo?.es_importado) {
        camposRotulo.push(
            ['Razón social del importador', rotulo.razon_social_importador],
            ['Domicilio del importador', rotulo.domicilio_importador],
            ['País de origen', rotulo.pais_origen],
        );
    }

    camposRotulo.push(
        ['Instrucciones de uso', rotulo?.instrucciones_uso],
        ['Instrucciones de conservación', rotulo?.instrucciones_conservacion],
    );

    camposRotulo.forEach(([etiqueta, valor]) => {
        y = agregarCampo(doc, etiqueta, valor, y);
    });

    // Ingredientes y composición.
    y = agregarSeccion(doc, '2. Ingredientes y composición', y + 5);

    y = agregarCampo(
        doc,
        'Versión de receta',
        exportacion.version_receta ?? 'No disponible',
        y,
    );

    const filasIngredientes = [
        ...ingredientes.map((item) => [
            valorTexto(item.nombre_insumo ?? item.nombre),
            `${valorTexto(item.cantidad_gramos)} g`,
            `${valorTexto(item.porcentaje)}%`,
        ]),
        ...aditivos.map((item) => [
            valorTexto(item.nombre_aditivo ?? item.nombre),
            `${valorTexto(item.cantidad_gramos)} g`,
            `${valorTexto(item.porcentaje)}%`,
        ]),
    ];

    y = agregarTabla(
        doc,
        ['Ingrediente / aditivo', 'Cantidad', 'Porcentaje'],
        filasIngredientes,
        y,
    ) + 7;

    y = agregarCampo(
        doc,
        'Total de la composición',
        ingredientesSnapshot?.total_gramos !== undefined
            ? `${valorTexto(ingredientesSnapshot.total_gramos)} g`
            : null,
        y,
    );

    y = agregarCampo(
        doc,
        'Suma de porcentajes',
        ingredientesSnapshot?.suma_porcentajes !== undefined
            ? `${valorTexto(ingredientesSnapshot.suma_porcentajes)}%`
            : null,
        y,
    );

    // Información nutricional.
    y = agregarSeccion(doc, '3. Información nutricional', y + 5);

    y = agregarCampo(
        doc,
        'Rendimiento final',
        nutricionSnapshot?.rendimiento_final_gramos !== undefined
            ? `${valorTexto(nutricionSnapshot.rendimiento_final_gramos)} g`
            : null,
        y,
    );

    y = agregarCampo(
        doc,
        'Tamaño de porción',
        nutricionSnapshot?.unidad_venta_gramos !== undefined
            ? `${valorTexto(nutricionSnapshot.unidad_venta_gramos)} g`
            : null,
        y,
    );

    y = agregarCampo(
        doc,
        'Medida casera',
        nutricionSnapshot?.medida_casera,
        y,
    );

    const filasNutricionales = nutrientes.map((item) => [
        obtenerNombreNutriente(item.nutriente),
        valorTexto(item.valor_100g_expresado ?? item.valor_100g_raw),
        valorTexto(item.valor_porcion_expresado ?? item.valor_porcion_raw),
        valorTexto(item.porcentaje_vd_expresado ?? item.porcentaje_vd),
    ]);

    y = agregarTabla(
        doc,
        ['Nutriente', 'Por 100 g', 'Por porción', '% VD'],
        filasNutricionales,
        y,
    ) + 7;

    // Sellos de advertencia.
    y = agregarSeccion(doc, '4. Sellos de advertencia', y + 5);

    const filasSellos = sellos.map((sello) => [
        typeof sello === 'string' ? sello : JSON.stringify(sello),
    ]);

    y = agregarTabla(doc, ['Sello registrado'], filasSellos, y) + 7;

    // Anexo técnico.
    y = agregarSeccion(doc, '5. Anexo técnico y trazabilidad', y + 5);

    y = agregarCampo(doc, 'ID de receta', exportacion.receta_id, y);
    y = agregarCampo(
        doc,
        'Versión de receta',
        exportacion.version_receta,
        y,
    );
    y = agregarCampo(
        doc,
        'ID del cálculo de sellos',
        exportacion.calculo_sellos_id,
        y,
    );
    y = agregarCampo(
        doc,
        'ID de parámetros normativos',
        exportacion.parametros_id,
        y,
    );
    y = agregarCampo(
        doc,
        'Versión de parámetros',
        exportacion.version_parametros,
        y,
    );

    if (calculoSellos) {
        y = agregarCampo(
            doc,
            'Detalle del cálculo de sellos',
            JSON.stringify(calculoSellos),
            y,
        );
    } else {
        y = agregarCampo(
            doc,
            'Cálculo de sellos',
            'No hay un cálculo asociado a esta exportación.',
            y,
        );
    }

    if (receta) {
        y = agregarCampo(
            doc,
            'Datos de receta',
            JSON.stringify(receta),
            y,
        );
    }

    // Lotes asociados.
    y = agregarSeccion(doc, '6. Lotes asociados', y + 5);

    const filasLotes = lotes.map((lote) => [
        valorTexto(lote.nro_lote),
        valorTexto(lote.fecha_duracion),
    ]);

    agregarTabla(
        doc,
        ['Número de lote', 'Fecha de duración'],
        filasLotes,
        y,
    );

    // Identificación y paginación en todas las páginas.
    agregarPieYMarca(doc, fecha);

    const nombreProducto = valorTexto(
        rotulo?.denominacion_venta,
        'rotulo',
    )
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

    doc.save(
        `borrador-rotulo-${nombreProducto}-exportacion-${exportacion.id}.pdf`,
    );
}
