import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InformacionNutricionalProducto } from '../types/datosNutricionales';
import { getConfiguracionEmpresa } from '../services/configuracionEmpresaServices';
import { formatearValor } from '../features/datosNutricionales/nutrientes.ts';

function obtenerTextoPorcion(datos: InformacionNutricionalProducto): string {
    if (!datos.porcion) return 'Porción no declarada';
    const base = `${formatearValor(datos.porcion)} ${datos.unidad_base}`;
    return datos.medida_casera ? `${base} (${datos.medida_casera})` : base;
}

function formatearCelda(valor: number | null, unidad: string, completo: boolean): string {
    if (valor === null) return 'Sin dato';
    const texto = `${formatearValor(valor)} ${unidad}`;
    return completo ? texto : `${texto} *`;
}

function formatearVd(porcentaje: number | null): string {
    return porcentaje === null ? '—' : `${porcentaje}%`;
}

export async function exportarTablaNutricionalPDF(datos: InformacionNutricionalProducto): Promise<void> {
    let empresaConfig = null;
    try {
        empresaConfig = await getConfiguracionEmpresa();
    } catch {
        // Fallback si la API no está disponible
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

    // Logo opcional
    if (empresaConfig?.logo_base64 && empresaConfig.logo_base64.startsWith('data:image')) {
        try {
            doc.addImage(empresaConfig.logo_base64, 'PNG', margin, headerY, 45, 45);
        } catch {
        }
    }


    const startTextX = empresaConfig?.logo_base64 ? margin + 55 : margin;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(empresaConfig?.nombre_empresa || 'SAIA - Control de Calidad', startTextX, headerY + 14);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(`CUIT: ${empresaConfig?.cuit || '30-00000000-0'}`, startTextX, headerY + 26);
    doc.text(`Domicilio: ${empresaConfig?.domicilio || 'Sin especificar'}`, startTextX, headerY + 36);

    const fechaStr = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    doc.text(`Fecha de emisión: ${fechaStr}`, pageWidth - margin, headerY + 14, { align: 'right' });

    headerY += 46;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, headerY, pageWidth - margin, headerY);

    // Titulo
    headerY += 18;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`INFORMACIÓN NUTRICIONAL — ${datos.producto_nombre}`, margin, headerY);

    headerY += 14;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Porción: ${obtenerTextoPorcion(datos)}`, margin, headerY);

    // Marca si la tabla está incompleta
    const esCompleta = datos.estado === 'completa';
    if (!esCompleta) {
        headerY += 13;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        const detalleIncompleta =
            datos.insumos_sin_datos.length > 0
                ? `Tabla incompleta: faltan datos en ${datos.insumos_sin_datos.join(', ')}.`
                : !datos.porcion
                  ? 'Tabla incompleta: falta declarar la porción del producto.'
                  : 'Tabla incompleta: sin insumos cargados.';
        doc.text(`[!] ${detalleIncompleta}`, margin, headerY);
    }

    const encabezadoCien = `Por 100 ${datos.unidad_base}`;
    const filas = datos.filas.map((fila) => [
        fila.subnivel ? `   ${fila.nombre}` : fila.nombre,
        formatearCelda(fila.valor_100g, fila.unidad, fila.completo),
        formatearCelda(fila.valor_porcion, fila.unidad, fila.completo),
        formatearVd(fila.porcentaje_vd),
    ]);

    autoTable(doc, {
        head: [['Nutriente', encabezadoCien, 'Por porción', '% VD (*)']],
        body: filas,
        startY: headerY + 8,
        margin: { left: margin, right: margin, bottom: 40 },
        styles: {
            font: 'Helvetica',
            fontSize: 8,
            cellPadding: 4,
            textColor: [0, 0, 0],
            valign: 'middle',
            fillColor: [255, 255, 255], 
            lineColor: [200, 200, 200],
            lineWidth: { top: 0.25, bottom: 0.25, left: 0, right: 0 }, 
        },
        headStyles: {
            fillColor: [255, 255, 255], 
            textColor: [0, 0, 0],       
            fontStyle: 'bold',
            lineColor: [0, 0, 0],       
            lineWidth: { top: 1.5, bottom: 1, left: 0, right: 0 }, 
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255], 
        },
        didDrawPage: (data) => {
            const totalPages = (doc as any).internal.getNumberOfPages();
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `Página ${data.pageNumber} de ${totalPages} - Generado por SAIA`,
                pageWidth / 2,
                pageHeight - 20,
                { align: 'center' }
            );
        },
    });


    const tableFinalY = (doc as any).lastAutoTable?.finalY ?? (headerY + 120);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.5);
    doc.line(margin, tableFinalY, pageWidth - margin, tableFinalY);


    let pieY = tableFinalY + 10;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    const lineasNota = doc.splitTextToSize(datos.nota_pie, pageWidth - margin * 2);
    doc.text(lineasNota, margin, pieY);
    pieY += lineasNota.length * 9 + 4;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const lineasLeyenda = doc.splitTextToSize(datos.leyenda, pageWidth - margin * 2);
    doc.text(lineasLeyenda, margin, pieY);

    const nombreLimpio = datos.producto_nombre.toLowerCase().replace(/\s+/g, '_');
    doc.save(`tabla_nutricional_${nombreLimpio}.pdf`);
}

export function exportarTablaNutricionalImagen(datos: InformacionNutricionalProducto): void {
    const esCompleta = datos.estado === 'completa';
    const encabezadoCien = `Por 100 ${datos.unidad_base}`;

    const lineasEncabezado = [
        `INFORMACIÓN NUTRICIONAL — ${datos.producto_nombre}`,
        `Porción: ${obtenerTextoPorcion(datos)}`,
    ];
    if (!esCompleta) {
        lineasEncabezado.push('ATENCIÓN: Tabla incompleta (faltan datos en insumos o definir porción).');
    }

    const columnas = ['Nutriente', encabezadoCien, 'Por porción', '% VD (*)'];
    const filas = datos.filas.map((fila) => [
        fila.subnivel ? `   ${fila.nombre}` : fila.nombre,
        formatearCelda(fila.valor_100g, fila.unidad, fila.completo),
        formatearCelda(fila.valor_porcion, fila.unidad, fila.completo),
        formatearVd(fila.porcentaje_vd),
    ]);

    const pie = [datos.nota_pie, datos.leyenda];
    const ancho = 640;
    const alto = 160 + filas.length * 28 + pie.length * 24;

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, ancho - 24, alto - 24);

    let y = 38;
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(lineasEncabezado[0], 26, y);

    ctx.font = '12px sans-serif';
    for (let i = 1; i < lineasEncabezado.length; i++) {
        y += 20;
        ctx.fillText(lineasEncabezado[i], 26, y);
    }

    y += 12;
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(ancho - 24, y);
    ctx.stroke();

    const xCols = [26, 330, 460, 560];
    y += 20;
    ctx.font = 'bold 12px sans-serif';
    columnas.forEach((col, idx) => {
        ctx.fillText(col, xCols[idx] ?? 26, y);
    });

    y += 8;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(ancho - 24, y);
    ctx.stroke();

    ctx.font = '12px sans-serif';
    filas.forEach((fila) => {
        y += 22;
        fila.forEach((celda, idx) => {
            ctx.fillText(celda, xCols[idx] ?? 26, y);
        });
    });

    y += 14;
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(ancho - 24, y);
    ctx.stroke();

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#333333';
    pie.forEach((linea) => {
        y += 18;
        ctx.fillText(linea, 26, y, ancho - 52);
    });

    const nombreLimpio = datos.producto_nombre.toLowerCase().replace(/\s+/g, '_');
    const enlace = document.createElement('a');
    enlace.href = canvas.toDataURL('image/png');
    enlace.download = `tabla_nutricional_${nombreLimpio}.png`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
}