import type { UnidadMedida } from './unidadesMedida';

export type TipoProducto = 'alimento' | 'bebida';

export interface Producto {
    id: number;
    nombre: string;
    tipo: TipoProducto;
    stock: number;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
}

export interface ProductoPayload {
    nombre: string;
    tipo: TipoProducto;
    stock: number;
    unidad_medida_id: number;
}

export interface ProductoResumen {
    id: number;
    nombre: string;
    tipo: TipoProducto;
    unidad_medida: UnidadMedida;
}
