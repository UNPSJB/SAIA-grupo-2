import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getConfiguracionEmpresa } from '../services/configuracionEmpresaServices';
import type { ConfiguracionEmpresa } from '../types/configuracionEmpresa';
import type { Insumo } from '../types/insumos';
import type { Aditivo } from '../types/aditivos';
import type { Equipo } from '../types/equipos';

export interface DatosExportarRecetaPDF {
    nombreProducto: string;
    version: number;
    rendimientoFinalGramos: number;
    unidadVentaGramos: number;
    medidaCasera?: string | null;
    motivoCambio?: string | null;
    fechaVigencia?: string | null;
    detalles: Array<{
        insumo_id: number;
        cantidad_original: number;
        unidad_medida_nombre: string;
        tipo_uso: string;
        aditivo_id?: number | null;
    }>;
    pasos: Array<{
        orden: number;
        nombre_paso: string;
        procedimiento: string;
        equipo_id?: number | null;
        tiempo_minutos?: number | null;
        temperatura_celsius?: number | null;
        es_punto_control?: boolean;
    }>;
    insumos?: Insumo[];
    aditivos?: Aditivo[];
    equipos?: Equipo[];
}

export interface ResultadoGeneracionPDF {
    doc: jsPDF;
    filename: string;
    blobUrl: string;
}

export async function generarRecetaPDFDoc(datos: DatosExportarRecetaPDF): Promise<ResultadoGeneracionPDF> {
    let empresaConfig: ConfiguracionEmpresa | null = null;
    try {
        empresaConfig = await getConfiguracionEmpresa();
    } catch {
        // Fallback si no se pudieron cargar datos de la empresa
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;

    let currentY = margin;

    // 1. TOP HEADER LAYOUT WITH LOGO
    const logoSize = 52;
    const tieneLogo = Boolean(empresaConfig?.logo_base64 && empresaConfig.logo_base64.startsWith('data:image'));

    // Header box for "FICHA TÉCNICA COCINA"
    const headerBoxWidth = tieneLogo ? contentWidth - logoSize - 15 : contentWidth;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, headerBoxWidth, 38, 'DF');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(0, 0, 0);
    doc.text('FICHA TÉCNICA COCINA', margin + headerBoxWidth / 2, currentY + 24, { align: 'center' });

    // Render Logo if available on top right
    if (tieneLogo && empresaConfig?.logo_base64) {
        try {
            doc.addImage(empresaConfig.logo_base64, 'PNG', pageWidth - margin - logoSize, currentY - 2, logoSize, logoSize);
        } catch {
            // Ignorar error de imagen
        }
    }

    currentY += 54;

    // 2. RECETA TITLE
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`RECETA: ${datos.nombreProducto.toUpperCase()}`, margin, currentY);

    currentY += 12;

    // 3. TABLA DE METADATOS Y CATEGORÍA
    const fechaEmision = datos.fechaVigencia
        ? new Date(datos.fechaVigencia).toLocaleDateString('es-AR')
        : new Date().toLocaleDateString('es-AR');

    const tablaMetadatos = [
        [
            { content: 'Empresa / Planta:', styles: { fontStyle: 'bold' } },
            empresaConfig?.nombre_empresa || 'SAIA Alimentos',
            { content: 'Versión / Edición:', styles: { fontStyle: 'bold' } },
            `Versión v${datos.version}`,
        ],
        [
            { content: 'Partida / CUIT:', styles: { fontStyle: 'bold' } },
            empresaConfig?.cuit || '30-00000000-0',
            { content: 'Raciones / Porción:', styles: { fontStyle: 'bold' } },
            `${datos.unidadVentaGramos.toLocaleString('es-AR')} g ${datos.medidaCasera ? `(${datos.medidaCasera})` : ''}`,
        ],
        [
            { content: 'Fecha Vigencia:', styles: { fontStyle: 'bold' } },
            fechaEmision,
            { content: 'Rendimiento Batch:', styles: { fontStyle: 'bold' } },
            `${datos.rendimientoFinalGramos.toLocaleString('es-AR')} g`,
        ],
    ];

    autoTable(doc, {
        startY: currentY,
        body: tablaMetadatos as any,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
            font: 'Helvetica',
            fontSize: 9,
            cellPadding: 4.5,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.8,
        },
        columnStyles: {
            0: { cellWidth: 105, fillColor: [245, 245, 245] },
            1: { cellWidth: 155 },
            2: { cellWidth: 105, fillColor: [245, 245, 245] },
            3: { cellWidth: 157 },
        },
    });

    currentY = (doc as any).lastAutoTable.finalY + 16;

    // 4. TABLA DE INGREDIENTES Y ADITIVOS (3 Columnas Limpias)
    const insumosMap = new Map((datos.insumos || []).map((i) => [i.id, i]));
    const aditivosMap = new Map((datos.aditivos || []).map((a) => [a.id, a]));
    const equiposMap = new Map((datos.equipos || []).map((e) => [e.id, e]));

    const formatearUnidad = (u: string) => {
        if (!u) return 'g';
        const str = u.trim();
        if (str.toLowerCase() === 'gramos' || str.toLowerCase() === 'gramo') return 'g';
        return str;
    };

    const filasIngredientes = datos.detalles.map((d, index) => {
        const insumoObj = insumosMap.get(d.insumo_id);
        const aditivoObj = d.aditivo_id ? aditivosMap.get(d.aditivo_id) : null;

        const nombreInsumo = insumoObj?.nombre || `Insumo #${d.insumo_id}`;
        const detalleAditivo = aditivoObj
            ? ` (${aditivoObj.nombre_completo}${aditivoObj.numero_ins ? ` INS ${aditivoObj.numero_ins}` : ''})`
            : '';

        return [
            index + 1,
            `${d.cantidad_original.toLocaleString('es-AR')} ${formatearUnidad(d.unidad_medida_nombre)}`,
            `${nombreInsumo}${detalleAditivo}`,
        ];
    });

    autoTable(doc, {
        startY: currentY,
        head: [['#', 'CANTIDAD', 'INGREDIENTE / INSUMO']],
        body: filasIngredientes,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
            font: 'Helvetica',
            fontSize: 9,
            cellPadding: 5,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.8,
            valign: 'middle',
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'left',
        },
        columnStyles: {
            0: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 100, halign: 'center' },
            2: { cellWidth: 390 },
        },
    });

    currentY = (doc as any).lastAutoTable.finalY + 18;

    // 5. MÉTODO DE ELABORACIÓN
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('MÉTODO DE ELABORACIÓN', pageWidth / 2, currentY, { align: 'center' });

    currentY += 8;

    const filasPasos = datos.pasos.map((p, index) => {
        const equipoObj = p.equipo_id ? equiposMap.get(p.equipo_id) : null;
        const notas: string[] = [];
        if (equipoObj) notas.push(`Equipo: ${equipoObj.nombre}`);
        if (p.tiempo_minutos) notas.push(`Tiempo: ${p.tiempo_minutos} min`);
        if (p.temperatura_celsius) notas.push(`Temp: ${p.temperatura_celsius} °C`);
        if (p.es_punto_control) notas.push('PUNTO CRÍTICO DE CONTROL (PCC)');

        let instruccion = p.nombre_paso ? `${p.nombre_paso}: ${p.procedimiento}` : p.procedimiento;
        if (notas.length > 0) {
            instruccion += `\n(${notas.join(' · ')})`;
        }

        return [index, instruccion];
    });

    autoTable(doc, {
        startY: currentY,
        body: filasPasos,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
            font: 'Helvetica',
            fontSize: 9,
            cellPadding: 5,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.8,
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 494 },
        },
    });

    currentY = (doc as any).lastAutoTable.finalY + 18;

    // 6. OBSERVACIONES Y VARIACIONES
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('OBSERVACIONES Y VARIACIONES', pageWidth / 2, currentY, { align: 'center' });

    currentY += 8;

    const observaciones = [
        datos.motivoCambio ? `Motivo del cambio de versión: ${datos.motivoCambio}` : 'Receta aprobada para producción estandarizada.',
        datos.medidaCasera ? `Porcionado y presentación recomendada: ${datos.medidaCasera}.` : 'Porcionado según especificaciones de unidad de venta.',
        `Rendimiento total por batch: ${datos.rendimientoFinalGramos.toLocaleString('es-AR')} g.`,
    ];

    const filasObservaciones = observaciones.map((obs, idx) => [idx + 1, obs]);

    autoTable(doc, {
        startY: currentY,
        body: filasObservaciones,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
            font: 'Helvetica',
            fontSize: 9,
            cellPadding: 5,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.8,
        },
        columnStyles: {
            0: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 494 },
        },
    });

    // 7. PIE DE PÁGINA
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);

        const pieY = pageHeight - 20;
        doc.text(
            `Ficha Técnica emitida por ${empresaConfig?.nombre_empresa || 'SAIA 2'} | Página ${i} de ${totalPages}`,
            pageWidth / 2,
            pieY,
            { align: 'center' },
        );
    }

    const nombreLimpio = datos.nombreProducto.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `ficha_tecnica_${nombreLimpio}_v${datos.version}.pdf`;
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return { doc, filename, blobUrl };
}

export async function exportarRecetaPDF(datos: DatosExportarRecetaPDF): Promise<void> {
    const { doc, filename } = await generarRecetaPDFDoc(datos);
    doc.save(filename);
}
