import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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



//funciones para exportar tablas. desde el componente tabla paginada
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



export function exportarAPDF(titulo: string, encabezados: string[], filas: string[][]): void {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    doc.setFontSize(16);
    doc.setTextColor(33, 37, 41);
    doc.text(titulo, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.text(`Fecha de emisión: ${fecha}`, 14, 22);
    autoTable(doc, {
        head: [encabezados],
        body: filas,
        startY: 27,
        styles: {
            fontSize: 9,
            cellPadding: 3
        },
        headStyles: {
            fillColor: [44, 62, 80], 
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [248, 249, 250] 
        }
    });
    const nombreLimpio = titulo.toLowerCase().replace(/\s+/g, '_');
    doc.save(`${nombreLimpio}.pdf`);
}