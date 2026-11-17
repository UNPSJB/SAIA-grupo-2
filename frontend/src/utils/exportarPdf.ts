import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ConfiguracionEmpresa } from '../types/configuracionEmpresa';

export function exportarReportePDF(
    tituloReporte: string,
    headers: string[],
    rows: (string | number)[][],
    empresaConfig?: ConfiguracionEmpresa | null,
    filename: string = 'reporte'
) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;

    let headerY = margin;

    if (empresaConfig?.logo_base64 && empresaConfig.logo_base64.startsWith('data:image')) {
        try {
            doc.addImage(empresaConfig.logo_base64, 'PNG', margin, headerY, 50, 50);
        } catch {
            // Si el formato de imagen no es valido continua
        }
    }

    const startTextX = empresaConfig?.logo_base64 ? margin + 60 : margin;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(empresaConfig?.nombre_empresa || 'SAIA - Control de Calidad', startTextX, headerY + 14);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`CUIT: ${empresaConfig?.cuit || '30-00000000-0'}`, startTextX, headerY + 26);
    doc.text(`Domicilio: ${empresaConfig?.domicilio || 'Sin especificar'}`, startTextX, headerY + 36);
    doc.text(`Contacto: ${empresaConfig?.telefono || ''} | ${empresaConfig?.email || ''}`, startTextX, headerY + 46);

    const fechaStr = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    doc.setFontSize(8);
    doc.text(`Fecha de emisión: ${fechaStr}`, pageWidth - margin, headerY + 14, { align: 'right' });

    headerY += 60;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, headerY, pageWidth - margin, headerY);

    headerY += 20;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(tituloReporte, margin, headerY);

    autoTable(doc, {
        startY: headerY + 10,
        head: [headers],
        body: rows,
        margin: { left: margin, right: margin, bottom: 40 },
        styles: {
            font: 'Helvetica',
            fontSize: 8,
            cellPadding: 5,
            textColor: [30, 41, 59],
            valign: 'middle',
        },
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        didDrawPage: (data) => {
            const totalPages = (doc as any).internal.getNumberOfPages();
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Página ${data.pageNumber} de ${totalPages} - Generado por SAIA 2 Sistema de Aseguramiento de Inocuidad Alimentaria`,
                pageWidth / 2,
                pageHeight - 20,
                { align: 'center' }
            );
        }
    });

    doc.save(`${filename.replace(/\s+/g, '_')}.pdf`);
}
