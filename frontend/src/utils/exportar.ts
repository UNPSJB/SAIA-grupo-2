import jsPDF from 'jspdf';

export async function captureChartCanvas(canvasId: string): Promise<string | null> {
    const element = document.getElementById(canvasId);
    if (!element) return null;

    if (element instanceof HTMLCanvasElement) {
        return element.toDataURL('image/png');
    }

    const childCanvas = element.querySelector('canvas');
    if (childCanvas) {
        return childCanvas.toDataURL('image/png');
    }

    // HTML Fallback con renderizador asíncrono
    return new Promise((resolve) => {
        try {
            const rect = element.getBoundingClientRect();
            const width = Math.max(rect.width || 600, 400);
            const height = Math.max(rect.height || 300, 200);

            const canvas = document.createElement('canvas');
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);

            ctx.scale(2, 2);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);

            const cloned = element.cloneNode(true) as HTMLElement;
            cloned.style.color = '#f8fafc';
            cloned.style.background = '#0f172a';
            cloned.style.padding = '12px';
            cloned.style.boxSizing = 'border-box';
            cloned.style.width = `${width}px`;

            const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                <foreignObject width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#f8fafc;font-family:system-ui,sans-serif;background:#0f172a;padding:10px;">
                        ${cloned.outerHTML}
                    </div>
                </foreignObject>
            </svg>`;

            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
        } catch {
            resolve(null);
        }
    });
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
