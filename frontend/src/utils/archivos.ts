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
