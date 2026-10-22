export const TAMANIO_MAXIMO_MB = 25;

export const TAMANIO_MAXIMO_BYTES = TAMANIO_MAXIMO_MB * 1024 * 1024;

export const TIPOS_ACEPTADOS = 'image/*,application/pdf';

export function esTipoAceptado(archivo: File): boolean {
    return archivo.type.startsWith('image/') || archivo.type === 'application/pdf';
}

export function esImagen(dataUrl: string): boolean {
    return dataUrl.startsWith('data:image/');
}
