import type { EmpleadoResumen } from './documentacion';
import type { MagnitudUnidad } from './unidadesMedida';

export type Nutriente =
    | 'energia'
    | 'carbohidratos'
    | 'azucares_totales'
    | 'azucares_anadidos'
    | 'proteinas'
    | 'grasas_totales'
    | 'grasas_saturadas'
    | 'grasas_trans'
    | 'fibra_alimentaria'
    | 'sodio';

export type FuenteDatoNutricional = 'sara' | 'rotulo_proveedor' | 'bibliografia' | 'valor_propio';

export type ValoresNutricionales = Record<Nutriente, number | null>;

export interface AlimentoReferencia extends ValoresNutricionales {
    codigo: string;
    nombre: string;
    magnitud: MagnitudUnidad;
    nombre_en_pdf: string | null;
}

export interface AlimentoResumen {
    codigo: string;
    nombre: string;
    magnitud: MagnitudUnidad;
    nombre_en_pdf: string | null;
}

export interface DatoNutricional {
    nutriente: Nutriente;
    valor: number;
    unidad: string;
    fuente: FuenteDatoNutricional;
    alimento: AlimentoResumen | null;
    referencia: string | null;
    valor_fuente: number;
    fecha_carga: string;
    cargado_por: EmpleadoResumen;
    modificado: boolean;
    modificado_por: EmpleadoResumen | null;
    fecha_modificacion: string | null;
}

export interface InsumoResumen {
    id: number;
    nombre: string;
    activo: boolean;
    magnitud: MagnitudUnidad;
}

export interface DatosNutricionalesInsumo {
    insumo: InsumoResumen;
    datos: DatoNutricional[];
}

export interface ResumenNutricionalInsumo {
    insumo: InsumoResumen;
    cargados: number;
    total: number;
    modificados: number;
    fuentes: FuenteDatoNutricional[];
    ultima_actualizacion: string | null;
}

export interface DatoNutricionalEntrada {
    nutriente: Nutriente;
    valor: number | null;
    fuente: FuenteDatoNutricional;
    alimento_codigo?: string | null;
    referencia?: string | null;
}
