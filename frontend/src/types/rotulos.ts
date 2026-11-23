import type { EstadoDeclaracion } from './alergenos';
import type { EstadoTablaNutricional, FuenteDatoNutricional } from './datosNutricionales';
import type { SelloAdvertencia } from './parametrosNormativos';
import type { ResultadoAplicabilidad, ResultadoCalculoSellos } from './rotuladoFrontal';
import type { TipoProducto } from './productos';

export interface ListaIngredientesSnapshot {
    version: number;
    texto_rotulo: string;
    es_orden_manual: boolean;
}

export interface ItemNutricionalSnapshot {
    nutriente: string;
    valor_100g_raw?: number | null;
    valor_porcion_raw?: number | null;
    valor_100g_expresado: string;
    valor_porcion_expresado: string;
    porcentaje_vd_expresado: string;
}

export interface TablaNutricionalSnapshot {
    version: number;
    unidad_venta_gramos: number;
    medida_casera: string | null;
    estado: EstadoTablaNutricional;
    faltantes: { insumo_nombre: string }[];
    items: ItemNutricionalSnapshot[];
}

export interface Rotulo {
    id: number;
    producto_id: number;
    denominacion_venta: string | null;
    contenido_neto: number | null;
    unidad_contenido_neto: string | null;
    rnpa_rppa: string | null;
    razon_social: string | null;
    domicilio: string | null;
    es_importado: boolean;
    razon_social_importador: string | null;
    domicilio_importador: string | null;
    pais_origen: string | null;
    instrucciones_uso: string | null;
    instrucciones_conservacion: string | null;
    lista_ingredientes: string | null;
    ingredientes_snapshot: ListaIngredientesSnapshot | null;
    nutricion_snapshot: TablaNutricionalSnapshot | null;
    sellos_snapshot: SelloAdvertencia[] | null;
    calculo_sellos_id: number | null;
    receta_id: number | null;
    receta_version: number | null;
    fecha_creacion: string;
    fecha_actualizacion: string;
}

export interface RotuloDatos {
    denominacion_venta?: string | null;
    contenido_neto?: number | null;
    unidad_contenido_neto?: string | null;
    rnpa_rppa?: string | null;
    razon_social?: string | null;
    domicilio?: string | null;
    es_importado?: boolean;
    razon_social_importador?: string | null;
    domicilio_importador?: string | null;
    pais_origen?: string | null;
    instrucciones_uso?: string | null;
    instrucciones_conservacion?: string | null;
    lista_ingredientes?: string | null;
}

export type RotuloCrear = { producto_id: number } & RotuloDatos;
export type RotuloActualizar = RotuloDatos;

export interface RotuloLote {
    id: number;
    rotulo_id: number;
    nro_lote: number;
    fecha_duracion: string | null;
    fecha_creacion: string;
}

export interface RotuloLoteCrear {
    nro_lote: number;
    fecha_duracion?: string | null;
}

export interface RotuloLoteActualizar {
    fecha_duracion?: string | null;
}

export interface HistorialCambioRotulo {
    id: number;
    rotulo_id: number;
    campo: string;
    valor_original: string | null;
    valor_nuevo: string | null;
    empleado_id: number | null;
    empleado_nombre?: string | null;
    empleado_apellido?: string | null;
    fecha_cambio: string;
}

export interface CompletitudRotulo {
    rotulo_id: number;
    porcentaje_completitud: number;
    completo: boolean;
    faltantes: string[];
}

export interface SelloVista {
    sello: SelloAdvertencia;
    texto: string;
}

export interface CaraPrincipal {
    denominacion_venta: string | null;
    contenido_neto: number | null;
    unidad_contenido_neto: string | null;
    aplica_advertencias: boolean | null;
    resultado_aplicabilidad: ResultadoAplicabilidad | null;
    motivo: string | null;
    sellos: SelloVista[];
    leyendas: SelloVista[];
    calculo_provisorio: boolean;
    parametros_version: number | null;
    parametros_fecha_vigencia: string | null;
    receta_version_calculo: number | null;
}

export interface OrigenVista {
    razon_social: string | null;
    domicilio: string | null;
    rnpa_rppa: string | null;
    es_importado: boolean;
    razon_social_importador: string | null;
    domicilio_importador: string | null;
    pais_origen: string | null;
}

export interface LoteVista {
    rotulo_lote_id: number;
    nro_lote: number;
    fecha_elaboracion: string;
    fecha_duracion: string | null;
}

export interface FilaNutricionalVista {
    nutriente: string;
    nombre: string;
    subnivel: boolean;
    valor_100g: string;
    valor_porcion: string;
    porcentaje_vd: string;
}

export interface TablaNutricionalVista {
    estado: EstadoTablaNutricional;
    porcion_gramos: number;
    medida_casera: string | null;
    filas: FilaNutricionalVista[];
    insumos_sin_datos: string[];
    nota_pie: string;
}

export interface VistaPreviaRotulo {
    rotulo_id: number;
    producto: { id: number; nombre: string; tipo: TipoProducto };
    leyenda_borrador: string;
    cara_principal: CaraPrincipal;
    lista_ingredientes: string | null;
    alergenos: { contiene: string | null; puede_contener: string | null; estado: EstadoDeclaracion | null };
    origen: OrigenVista;
    lote: LoteVista | null;
    lotes: LoteVista[];
    conservacion: string | null;
    instrucciones_uso: string | null;
    tabla_nutricional: TablaNutricionalVista | null;
    receta_version: number | null;
    receta_version_vigente: number | null;
    advertencias: string[];
    faltantes: string[];
    completo: boolean;
    fecha_generacion: string;
}

export interface RenglonRecetaRespaldo {
    renglon: number;
    insumo: string;
    cantidad_original: number;
    unidad: string | null;
    cantidad_gramos: number;
    tipo_uso: 'ingrediente' | 'aditivo';
    aditivo: { nombre: string; numero_ins: string | null; funcion: string | null } | null;
}

export interface RecetaRespaldo {
    receta_id: number;
    version: number;
    estado: string;
    fecha_vigencia: string | null;
    motivo_cambio: string | null;
    rendimiento_final_gramos: number;
    unidad_venta_gramos: number;
    medida_casera: string | null;
    renglones: RenglonRecetaRespaldo[];
}

export interface ItemComposicionRespaldo {
    renglon: number;
    nombre_insumo: string;
    cantidad_gramos: number;
    porcentaje: number;
    tipo_uso: 'ingrediente' | 'aditivo';
}

export interface ComposicionRespaldo {
    version: number;
    total_gramos: number;
    ingredientes: ItemComposicionRespaldo[];
    aditivos: ItemComposicionRespaldo[];
    suma_porcentajes: number;
    suma_correcta: boolean;
}

export interface FuenteInsumoRespaldo {
    insumo: string;
    datos: {
        nutriente: string;
        valor_100g: number;
        fuente: FuenteDatoNutricional;
        referencia: string | null;
        modificado: boolean;
        fecha_carga: string;
    }[];
}

export interface RespaldoExportacion {
    tipo: 'borrador';
    leyenda_borrador: string;
    fecha_exportacion: string;
    borrador: VistaPreviaRotulo;
    receta: RecetaRespaldo | null;
    composicion: ComposicionRespaldo | null;
    tabla_nutricional: {
        calculo: TablaNutricionalSnapshot | null;
        fuentes: FuenteInsumoRespaldo[];
    };
    calculo_sellos: ResultadoCalculoSellos | null;
}

export interface ExportacionRotulo {
    id: number;
    rotulo_id: number;
    empleado_id: number;
    empleado_nombre: string | null;
    empleado_apellido: string | null;
    fecha_exportacion: string;
    receta_id: number | null;
    version_receta: number | null;
    calculo_sellos_id: number | null;
    parametros_id: number | null;
    version_parametros: number | null;
}

export interface ExportacionRotuloDetalle extends ExportacionRotulo {
    respaldo_snapshot: RespaldoExportacion;
}
