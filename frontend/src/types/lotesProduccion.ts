import type { ProductoResumen } from './productos';
import type { EmpleadoResumen } from './documentacion';
import type { MagnitudUnidad } from './unidadesMedida';

export interface LoteProduccion {
    nro_lote: number;
    producto_id: number;
    fecha: string;
    cantidad: number;
    producto: ProductoResumen;
    fecha_registro: string;
    cerrado: boolean;
    fecha_cierre: string | null;
    cerrado_por: EmpleadoResumen | null;
}

export interface InsumoUtilizadoPayload {
    insumo_id: number;
    cantidad_utilizada: number;
    unidad_medida_id: number;
}

export interface LoteProduccionPayload {
    producto_id: number;
    fecha: string;
    cantidad: number;
    insumos: InsumoUtilizadoPayload[];
}

export interface FiltrosLotes {
    productoId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
}

export interface InsumoAsociado {
    insumo_id: number;
    nombre: string;
    cantidad_utilizada: number;
    unidad_medida: string;
    magnitud: MagnitudUnidad;
}
