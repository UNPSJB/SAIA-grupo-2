import type { EmpleadoResumen } from './documentacion';
import type { Agregado, EstadoConjunto, SelloAdvertencia } from './parametrosNormativos';
import type { TipoProducto } from './productos';

export type ResultadoAplicabilidad = 'no_envasado' | 'exceptuado' | 'sin_agregados' | 'corresponde';

export interface MarcasAgregados {
    agrega_azucares: boolean;
    agrega_grasas: boolean;
    agrega_sodio: boolean;
    contiene_edulcorantes: boolean;
    contiene_cafeina: boolean;
}

export interface RespuestasAplicabilidad extends MarcasAgregados {
    envasado_en_ausencia_del_cliente: boolean;
    excepcion: string | null;
}

export interface ProductoRotulado {
    id: number;
    nombre: string;
    tipo: TipoProducto;
}

export interface SelloAplicable {
    sello: SelloAdvertencia;
    texto: string;
    es_leyenda: boolean;
}

export interface ParametrosUsados {
    id: number;
    version: number;
    estado: EstadoConjunto;
    norma_origen: string;
    fecha_vigencia: string;
}

export interface EvaluacionRotulado extends RespuestasAplicabilidad {
    id: number;
    producto: ProductoRotulado;
    version_receta: number | null;
    marcas_corregidas: boolean;
    resultado: ResultadoAplicabilidad;
    sellos_a_evaluar: SelloAplicable[];
    leyendas: SelloAplicable[];
    parametros: ParametrosUsados;
    fecha: string;
    evaluado_por: EmpleadoResumen;
}

export interface EstadoRotuladoProducto {
    producto: ProductoRotulado;
    evaluacion: EvaluacionRotulado | null;
}

export interface InsumoResumen {
    id: number;
    nombre: string;
}

export interface MarcaInsumo extends MarcasAgregados {
    insumo: InsumoResumen;
    revisado: boolean;
    fecha_cambio: string | null;
    cambiado_por: EmpleadoResumen | null;
}

export interface CambioMarcaInsumo extends MarcasAgregados {
    insumo_id: number;
}

export interface OrigenMarca {
    agregado: Agregado;
    insumo: string;
    aditivo: string | null;
    clase_funcional: string | null;
}

export interface PropuestaMarcas extends MarcasAgregados {
    tiene_receta: boolean;
    version_receta: number | null;
    origenes: OrigenMarca[];
    insumos_sin_revisar: InsumoResumen[];
}
