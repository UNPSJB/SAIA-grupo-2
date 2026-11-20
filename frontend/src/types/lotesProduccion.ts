import type { ProductoResumen } from './productos';
import type { EmpleadoResumen } from './documentacion';
import type { MagnitudUnidad } from './unidadesMedida';

export interface LoteProduccion {
    nro_lote: number;
    producto_id: number;
    fecha: string;
    cantidad: number;
    receta_id?: number | null;
    receta_version_id?: number | null;
    factor_escalado?: number | null;
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
    receta_id: number | null;
    receta_version_id?: number | null;
    factor_escalado?: number | null;
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

export interface EstadoLoteDesdeReceta {
    producto_id: number;
    cantidad: number;
    receta_id: number;
    receta_version_id: number;
    factor_escalado: number;
    insumos: InsumoUtilizadoPayload[]
}