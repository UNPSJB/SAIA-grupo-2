import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getConfiguracionEmpresa } from '../services/configuracionEmpresaServices';

function dataUrlABlob(dataUrl: string): Blob {
    const [encabezado, datos] = dataUrl.split(',');
    const tipo = encabezado.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
    const binario = atob(datos);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) {
        bytes[i] = binario.charCodeAt(i);
    }
    return new Blob([bytes], { type: tipo });
}

const MILISEGUNDOS_ANTES_DE_LIBERAR = 60000;

export function abrirArchivoEnPestania(url: string, nombre?: string | null): void {
    let destino = url;
    let esTemporal = false;

    if (url.startsWith('data:')) {
        try {
            destino = URL.createObjectURL(dataUrlABlob(url));
            esTemporal = true;
        } catch {
            destino = url;
        }
    }

    const enlace = document.createElement('a');
    enlace.href = destino;
    enlace.target = '_blank';
    enlace.rel = 'noopener';
    if (nombre) enlace.title = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    if (esTemporal) {
        window.setTimeout(() => URL.revokeObjectURL(destino), MILISEGUNDOS_ANTES_DE_LIBERAR);
    }
}

export function exportarACSV(nombreArchivo: string, encabezados: string[], filas: string[][]): void {
    const escapar = (texto: string) => `"${String(texto ?? '').replace(/"/g, '""')}"`;
    
    const contenido = '\uFEFF' + [
        encabezados.map(escapar).join(';'),
        ...filas.map(fila => fila.map(escapar).join(';'))
    ].join('\r\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarAPDF(titulo: string, encabezados: string[], filas: string[][]): Promise<void> {
    let empresaConfig = null;
    try {
        empresaConfig = await getConfiguracionEmpresa();
    } catch {
        // Fallback si la API no está disponible
    }

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
            // Si falla la imagen continua limpiamente
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
    doc.text(titulo, margin, headerY);

    autoTable(doc, {
        head: [encabezados],
        body: filas,
        startY: headerY + 10,
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

    const nombreLimpio = titulo.toLowerCase().replace(/\s+/g, '_');
    doc.save(`${nombreLimpio}.pdf`);
}
