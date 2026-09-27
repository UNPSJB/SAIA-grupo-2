export interface UnidadMedida {
    id: number;
    nombre: string;
    abreviatura: string;
}

export type TipoProductoLimpieza = 'detergente' | 'desinfectante' | 'desengrasante' | 'otro';

export interface ProductoLimpieza {
    id: number;
    nombre: string;
    tipo: TipoProductoLimpieza;
    stock: number;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
}

export interface ProductoLimpiezaPayload {
    nombre: string;
    tipo: TipoProductoLimpieza;
    stock: number;
    unidad_medida_id: number;
}