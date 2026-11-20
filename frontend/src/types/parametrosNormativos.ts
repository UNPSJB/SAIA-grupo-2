import type { Nutriente } from './datosNutricionales';
import type { EmpleadoResumen } from './documentacion';
import type { TipoProducto } from './productos';

export type EstadoConjunto = 'borrador' | 'publicado';

export type SelloAdvertencia =
    | 'exceso_azucares'
    | 'exceso_grasas_totales'
    | 'exceso_grasas_saturadas'
    | 'exceso_sodio'
    | 'exceso_calorias'
    | 'contiene_edulcorantes'
    | 'contiene_cafeina';

export type FormaCriterio = 'porcentaje_energia' | 'cantidad_cada_100' | 'mg_por_kcal';

export type CondicionCriterio = 'siempre' | 'con_sello_de_energia' | 'sin_aporte_energetico';

export type Agregado = 'azucares' | 'grasas' | 'sodio' | 'edulcorantes' | 'cafeina';

export type ClaveParametro = 'kcal_bebida_sin_aporte_energetico';

export interface CriterioSello {
    id: number;
    sello: SelloAdvertencia;
    tipo_producto: TipoProducto;
    forma: FormaCriterio;
    nutriente: Nutriente;
    limite: number;
    unidad: string;
    factor_energetico: number | null;
    condicion: CondicionCriterio;
}

export interface TextoSello {
    sello: SelloAdvertencia;
    texto: string;
    orden: number;
}

export interface SelloPorAgregado {
    agregado: Agregado;
    sello: SelloAdvertencia;
}

export interface ClaseAditivoPorAgregado {
    agregado: Agregado;
    clase_funcional: string;
}

export interface ExcepcionRotulado {
    id: number;
    descripcion: string;
}

export interface ParametroGeneral {
    clave: ClaveParametro;
    valor: number;
    unidad: string;
    descripcion: string;
}

export interface ConjuntoResumen {
    id: number;
    version: number;
    estado: EstadoConjunto;
    norma_origen: string;
    fecha_vigencia: string;
    fecha_creacion: string;
    creado_por: EmpleadoResumen | null;
    fecha_publicacion: string | null;
    publicado_por: EmpleadoResumen | null;
    vigente: boolean;
}

export interface ConjuntoDetalle extends ConjuntoResumen {
    notas: string | null;
    criterios: CriterioSello[];
    textos: TextoSello[];
    sellos_por_agregado: SelloPorAgregado[];
    clases_aditivo: ClaseAditivoPorAgregado[];
    excepciones: ExcepcionRotulado[];
    parametros_generales: ParametroGeneral[];
}

export interface BorradorUpdate {
    norma_origen?: string;
    fecha_vigencia?: string;
    notas?: string | null;
    criterios?: { id: number; limite: number; factor_energetico: number | null }[];
    textos?: { sello: SelloAdvertencia; texto: string }[];
    reglas?: { agregado: Agregado; sellos: SelloAdvertencia[] }[];
    clases_aditivo?: { agregado: Agregado; clases: string[] }[];
    excepciones?: string[];
    parametros_generales?: { clave: ClaveParametro; valor: number }[];
}

export interface ModuloRotuladoFrontal {
    activo: boolean;
    fecha_cambio: string | null;
    cambiado_por: EmpleadoResumen | null;
}
