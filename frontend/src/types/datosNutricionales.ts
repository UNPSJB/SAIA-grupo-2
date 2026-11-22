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

export type EstadoTablaNutricional = 'completa' | 'incompleta';

export interface FilaNutricionalNormativa {
    nutriente: Nutriente;
    nombre: string;
    unidad: string;
    subnivel: boolean;
    obligatorio: boolean;
    valor_100g: number | null;
    valor_porcion: number | null;
    porcentaje_vd: number | null;
    completo: boolean;
}

//nuevo 
export interface FaltanteNutricional {
    insumo_id: number;
    insumo_nombre: string;
    tipo_uso: string;
    datos_faltantes: string[];
    sin_fuente: string[];
}
// nuevo
export interface FilaNutricionalNormativa {
    nutriente: Nutriente;
    nombre: string;
    unidad: string;
    subnivel: boolean;
    obligatorio: boolean;
    valor_100g: number | null;
    valor_porcion: number | null;
    porcentaje_vd: number | null;
    completo: boolean;
}


export interface InformacionNutricionalProducto {
    producto_id: number;
    producto_nombre: string;
    unidad_base: string;
    porcion: number | null;
    medida_casera: string | null;
    estado: EstadoTablaNutricional;
    leyenda: string;
    nota_pie: string;
    insumos_sin_datos: string[];
    filas: FilaNutricionalNormativa[];
    faltantes?: FaltanteNutricional[];  //nuevo
}

export interface ValorDiarioReferencia {
    nutriente: Nutriente;
    valor_diario: number | null;
    unidad: string;
    umbral_no_significativo: number;
    decimales: number;
}

export interface ItemInformacionNutricional {
    nutriente: string;
    unidad: string;
    valor_100g_raw: number;
    valor_100g_expresado: string;
    valor_porcion_raw: number;
    valor_porcion_expresado: string;
    porcentaje_vd: number | null;
    porcentaje_vd_expresado: string;
}

export interface TablaNutricionalReceta {
    receta_id: number;
    version: number;
    rendimiento_final_gramos: number;
    unidad_venta_gramos: number;
    medida_casera: string | null;
    estado?: EstadoTablaNutricional;        // nuevo
    faltantes?: FaltanteNutricional[];   //nuevo
    items: ItemInformacionNutricional[];
}
