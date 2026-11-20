import jsPDF from 'jspdf';

export function captureChartCanvas(canvasId: string): string | null {
    const element = document.getElementById(canvasId);
    if (!element) return null;

    if (element instanceof HTMLCanvasElement) {
        return element.toDataURL('image/png');
    }

    const childCanvas = element.querySelector('canvas');
    if (childCanvas) {
        return childCanvas.toDataURL('image/png');
    }

    return null;
}

export function exportToPNG(dataUrl: string, filename: string = 'grafico.png') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function exportToPDF(dataUrl: string, filename: string = 'grafico.pdf') {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;

    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
        const imgRatio = img.width / img.height;
        const pdfRatio = (pdfWidth - margin * 2) / (pdfHeight - margin * 2);

        let drawWidth = pdfWidth - margin * 2;
        let drawHeight = (pdfWidth - margin * 2) / imgRatio;

        if (imgRatio < pdfRatio) {
            drawHeight = pdfHeight - margin * 2;
            drawWidth = (pdfHeight - margin * 2) * imgRatio;
        }

        const x = (pdfWidth - drawWidth) / 2;
        const y = (pdfHeight - drawHeight) / 2;

        pdf.addImage(dataUrl, 'PNG', x, y, drawWidth, drawHeight);
        pdf.save(filename);
    };
}
