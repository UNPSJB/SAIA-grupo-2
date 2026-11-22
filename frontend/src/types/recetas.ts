import type { MagnitudUnidad } from "./unidadesMedida";

export interface EscaladoRecetaPayload {
    factor?: number;
    cantidad_objetivo?: number;
    unidades_objetivo?: number;
}

export interface RenglonEscalado {
    insumo_id: number;
    insumo_nombre: string;
    unidad_medida_id: number;
    unidad_medida_nombre: string;
    magnitud: MagnitudUnidad;
    cantidad_original: number;
    cantidad_escalada: number;
    stock_disponible: number;
    stock_suficiente: boolean;
}

export interface RecetaEscalada {
    receta_id: number;
    receta_version_id: number;
    producto_id: number;
    rendimiento_original: number;
    rendimiento_esperado: number;
    cantidad_producto: number | null;
    unidad_producto_id: number;
    unidad_producto_nombre: string;
    factor_aplicado: number;
    renglones: RenglonEscalado[];
}

export interface EscalarRecetaProps {
    productoId: number;
    rutaNuevoLote?: string;
}