import type { TipoDocumentoVersionado } from "../../types/documentosVersionados";

export const ETIQUETAS_TIPO: Record<TipoDocumentoVersionado, string> = {
    manual_bpm: 'Manual de BPM',
    ficha_tecnica: 'Ficha Técnica',
    procedimiento: 'Procedimiento Operativo (POES)',
};

// Para mostrar como opciones
export const TIPOS_DOCUMENTO_VERSIONADO: TipoDocumentoVersionado[] = [
    'manual_bpm',
    'ficha_tecnica',
    'procedimiento',
];