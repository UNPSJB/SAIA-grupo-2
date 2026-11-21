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
        cantidad_gramos: number;
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

export async function exportarRecetaPDF(datos: DatosExportarRecetaPDF): Promise<void> {
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
    const margin = 40;

    let headerY = margin;

    // Barra superior decorativa
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Logo de la empresa
    if (empresaConfig?.logo_base64 && empresaConfig.logo_base64.startsWith('data:image')) {
        try {
            doc.addImage(empresaConfig.logo_base64, 'PNG', margin, headerY + 2, 50, 50);
        } catch {
            // Ignorar error de formato de imagen
        }
    }

    const startTextX = empresaConfig?.logo_base64 ? margin + 60 : margin;

    // Encabezado Empresa
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(empresaConfig?.nombre_empresa || 'SAIA - Control de Calidad Alimentaria', startTextX, headerY + 16);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`CUIT: ${empresaConfig?.cuit || '30-00000000-0'}`, startTextX, headerY + 28);
    doc.text(`Domicilio: ${empresaConfig?.domicilio || 'Sin especificar'}`, startTextX, headerY + 38);
    doc.text(`Contacto: ${empresaConfig?.telefono || ''} ${empresaConfig?.email ? `| ${empresaConfig.email}` : ''}`, startTextX, headerY + 48);

    const fechaStr = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Fecha de emisión: ${fechaStr}`, pageWidth - margin, headerY + 16, { align: 'right' });

    headerY += 60;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, headerY, pageWidth - margin, headerY);

    headerY += 18;

    // Título Principal Ficha Técnica
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`FICHA TÉCNICA DE RECETA: ${datos.nombreProducto.toUpperCase()}`, margin, headerY);

    headerY += 8;

    // Tabla Resumen de Ficha Técnica
    const resumenFilas = [
        [
            { content: 'Producto:', styles: { fontStyle: 'bold' } },
            datos.nombreProducto,
            { content: 'Versión Vigente:', styles: { fontStyle: 'bold' } },
            `v${datos.version}`,
        ],
        [
            { content: 'Rendimiento Obtenible:', styles: { fontStyle: 'bold' } },
            `${datos.rendimientoFinalGramos.toLocaleString('es-AR')} g`,
            { content: 'Unidad Venta / Porción:', styles: { fontStyle: 'bold' } },
            `${datos.unidadVentaGramos.toLocaleString('es-AR')} g`,
        ],
        [
            { content: 'Medida Casera Sugerida:', styles: { fontStyle: 'bold' } },
            datos.medidaCasera || '—',
            { content: 'Motivo del Cambio:', styles: { fontStyle: 'bold' } },
            datos.motivoCambio || '—',
        ],
    ];

    autoTable(doc, {
        startY: headerY + 6,
        body: resumenFilas as any,
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: {
            font: 'Helvetica',
            fontSize: 8.5,
            cellPadding: 5,
            textColor: [30, 41, 59],
        },
        columnStyles: {
            0: { cellWidth: 120, fillColor: [241, 245, 249] },
            1: { cellWidth: 135 },
            2: { cellWidth: 120, fillColor: [241, 245, 249] },
            3: { cellWidth: 140 },
        },
    });

    const startIngredientesY = (doc as any).lastAutoTable.finalY + 16;

    // Sección 1: Ingredientes y Aditivos
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Ingredientes y Aditivos (Fórmula)', margin, startIngredientesY);

    const insumosMap = new Map((datos.insumos || []).map((i) => [i.id, i]));
    const aditivosMap = new Map((datos.aditivos || []).map((a) => [a.id, a]));
    const equiposMap = new Map((datos.equipos || []).map((e) => [e.id, e]));

    const filasIngredientes = datos.detalles.map((d, index) => {
        const insumoObj = insumosMap.get(d.insumo_id);
        const aditivoObj = d.aditivo_id ? aditivosMap.get(d.aditivo_id) : null;

        const nombreInsumo = insumoObj?.nombre || `Insumo #${d.insumo_id}`;
        const tipoText = d.tipo_uso === 'aditivo' ? 'Aditivo' : 'Ingrediente';
        const detalleAditivo = aditivoObj
            ? `${aditivoObj.nombre_completo}${aditivoObj.numero_ins ? ` (INS ${aditivoObj.numero_ins})` : ''}`
            : '—';

        return [
            index + 1,
            nombreInsumo,
            tipoText,
            detalleAditivo,
            `${d.cantidad_gramos.toLocaleString('es-AR')} g`,
        ];
    });

    autoTable(doc, {
        startY: startIngredientesY + 8,
        head: [['#', 'Insumo', 'Tipo de Uso', 'Aditivo INS Referencia', 'Cantidad (g)']],
        body: filasIngredientes,
        margin: { left: margin, right: margin, bottom: 40 },
        styles: {
            font: 'Helvetica',
            fontSize: 8.5,
            cellPadding: 6,
            textColor: [30, 41, 59],
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: 30, halign: 'center' },
            1: { cellWidth: 150 },
            2: { cellWidth: 80 },
            3: { cellWidth: 175 },
            4: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
    });

    const startPasosY = (doc as any).lastAutoTable.finalY + 20;

    // Sección 2: Pasos de Elaboración
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Pasos de Elaboración y Puntos Críticos de Control (PCC)', margin, startPasosY);

    const filasPasos = datos.pasos.map((p, index) => {
        const equipoObj = p.equipo_id ? equiposMap.get(p.equipo_id) : null;
        const equipoText = equipoObj?.nombre || '—';
        const tiempoText = p.tiempo_minutos ? `${p.tiempo_minutos} min` : '—';
        const tempText = p.temperatura_celsius ? `${p.temperatura_celsius} °C` : '—';
        const pccText = p.es_punto_control ? 'SÍ (PCC)' : 'No';

        return [
            index + 1,
            p.nombre_paso,
            p.procedimiento,
            equipoText,
            tiempoText,
            tempText,
            pccText,
        ];
    });

    autoTable(doc, {
        startY: startPasosY + 8,
        head: [['#', 'Nombre del Paso', 'Procedimiento Detallado', 'Equipo', 'Tiempo', 'Temp.', 'PCC']],
        body: filasPasos,
        margin: { left: margin, right: margin, bottom: 40 },
        styles: {
            font: 'Helvetica',
            fontSize: 8.5,
            cellPadding: 6,
            textColor: [30, 41, 59],
            valign: 'top',
        },
        columnStyles: {
            0: { cellWidth: 25, halign: 'center' },
            1: { cellWidth: 115, fontStyle: 'bold' },
            2: { cellWidth: 200 },
            3: { cellWidth: 70 },
            4: { cellWidth: 45, halign: 'center' },
            5: { cellWidth: 45, halign: 'center' },
            6: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 6) {
                if (data.cell.raw === 'SÍ (PCC)') {
                    data.cell.styles.textColor = [220, 38, 38]; // #dc2626 red
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
        didDrawPage: (data) => {
            const totalPages = (doc as any).internal.getNumberOfPages();
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Página ${data.pageNumber} de ${totalPages}  |  SAIA 2 - Sistema de Aseguramiento de Inocuidad Alimentaria`,
                pageWidth / 2,
                pageHeight - 20,
                { align: 'center' },
            );
        },
    });

    const nombreLimpio = datos.nombreProducto.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`ficha_receta_${nombreLimpio}_v${datos.version}.pdf`);
}
