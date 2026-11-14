import type { ProductoResumen } from './productos';

export interface LoteProduccion {
    nro_lote: number;
    producto_id: number;
    fecha: string;
    cantidad: number;
    producto: ProductoResumen;
}

export interface LoteProduccionPayload {
    producto_id: number;
    fecha: string;
    cantidad: number;
}

export interface FiltrosLotes {
    productoId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
}



// nuevo
export interface InsumoAsociado {
    insumo_id: number;
    nombre: string;
    cantidad_utilizada: number;
    unidad_medida: string;
}
export interface AsociarInsumoPayload {
    insumo_id: number;
    cantidad_utilizada: number;
}