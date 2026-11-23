export interface Rotulo {
    id: number;
    producto_id: number;
    denominacion_venta: string | null;
    contenido_neto: number | null;
    unidad_contenido_neto: string | null;
    rnpa_rppa: string | null;
    razon_social: string | null;
    domicilio: string | null;
    es_importado: boolean;
    razon_social_importador: string | null;
    domicilio_importador: string | null;
    pais_origen: string | null;
    instrucciones_uso: string | null;
    instrucciones_conservacion: string | null;
    ingredientes_snapshot: unknown;
    nutricion_snapshot: unknown;
    sellos_snapshot: unknown;
    receta_id: number | null;
    receta_version: number | null;
    fecha_creacion: string;
    fecha_actualizacion: string;
}

export interface RotuloDatos {
    denominacion_venta?: string | null;
    contenido_neto?: number | null;
    unidad_contenido_neto?: string | null;
    rnpa_rppa?: string | null;
    razon_social?: string | null;
    domicilio?: string | null;
    es_importado?: boolean;
    razon_social_importador?: string | null;
    domicilio_importador?: string | null;
    pais_origen?: string | null;
    instrucciones_uso?: string | null;
    instrucciones_conservacion?: string | null;
}

export type RotuloCrear = { producto_id: number } & RotuloDatos;
export type RotuloActualizar = RotuloDatos;

export interface RotuloLote {
    id: number;
    rotulo_id: number;
    nro_lote: number;
    fecha_duracion: string | null;
    fecha_creacion: string;
}

export interface RotuloLoteCrear {
    nro_lote: number;
    fecha_duracion?: string | null;
}

export interface RotuloLoteActualizar {
    fecha_duracion?: string | null;
}

export interface HistorialCambioRotulo {
    id: number;
    rotulo_id: number;
    campo: string;
    valor_original: string | null;
    valor_nuevo: string | null;
    empleado_id: number | null;
    empleado_nombre?: string | null;
    empleado_apellido?: string | null;
    fecha_cambio: string;
}

export interface CompletitudRotulo {
    rotulo_id: number;
    porcentaje_completitud: number;
    completo: boolean;
    faltantes: string[];
}