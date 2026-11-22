import type { Equipo } from './equipos';
import type { Producto } from './productos';

export const ESTADOS_VERSION_RECETA = ['activo', 'archivado'] as const;
export type EstadoVersionReceta = (typeof ESTADOS_VERSION_RECETA)[number];

export const TIPOS_USO_INSUMO = ['ingrediente', 'aditivo'] as const;
export type TipoUsoInsumo = (typeof TIPOS_USO_INSUMO)[number];

export interface DetalleRecetaPayload {
    insumo_id: number;
    cantidad_gramos: number;
    tipo_uso: TipoUsoInsumo;
    aditivo_id?: number | null;
}

export interface DetalleReceta extends DetalleRecetaPayload {
    receta_id: number;
    nro_version: number;
    renglon: number;
}

export interface PasoRecetaPayload {
    orden?: number;
    nombre_paso: string;
    procedimiento: string;
    equipo_id?: number | null;
    tiempo_minutos?: number | null;
    temperatura_celsius?: number | null;
    es_punto_control?: boolean;
}

export interface PasoReceta {
    id: number;
    receta_id: number;
    version: number;
    orden: number;
    nombre_paso: string;
    procedimiento: string;
    equipo_id: number | null;
    tiempo_minutos: number | null;
    temperatura_celsius: number | null;
    es_punto_control: boolean;
    equipo: Equipo | null;
}

export interface VersionRecetaPayload {
    rendimiento_final_gramos: number;
    unidad_venta_gramos: number;
    medida_casera?: string | null;
    motivo_cambio?: string | null;
    creado_por_id?: number | null;
    fecha_vigencia?: string | null;
    detalles?: DetalleRecetaPayload[];
    pasos?: PasoRecetaPayload[];
}

export type VersionRecetaInicialPayload = VersionRecetaPayload;

export interface VersionReceta {
    receta_id: number;
    version: number;
    rendimiento_final_gramos: number;
    unidad_venta_gramos: number;
    medida_casera: string | null;
    motivo_cambio: string | null;
    creado_por_id: number | null;
    fecha_vigencia: string | null;
    estado: EstadoVersionReceta;
    detalles: DetalleReceta[];
    pasos: PasoReceta[];
}

export interface RecetaPayload {
    producto_id: number;
    version_inicial: VersionRecetaInicialPayload;
}

export interface Receta {
    id: number;
    producto_id: number;
    producto: Producto;
}

export interface ItemComposicionReceta {
    renglon: number;
    insumo_id: number;
    nombre_insumo: string;
    cantidad_gramos: number;
    porcentaje: number;
    tipo_uso: TipoUsoInsumo;
    aditivo_id: number | null;
}

export interface ComposicionReceta {
    receta_id: number;
    version: number;
    total_gramos: number;
    ingredientes: ItemComposicionReceta[];
    aditivos: ItemComposicionReceta[];
    suma_porcentajes: number;
    suma_correcta: boolean;
}

export type FormatoDeclaracionAditivos = 'funcion_nombre' | 'funcion_ins' | 'funcion_ambos';

export interface ConfiguracionProduccion {
    id: number;
    formato_declaracion_aditivos: FormatoDeclaracionAditivos;
}

export interface IngredienteRotuloItem {
    insumo_id: number;
    nombre_insumo: string;
    denominacion_rotulo: string;
    cantidad_gramos: number;
    porcentaje: number;
    renglon_original: number;
}

export interface AditivoRotuloItem {
    aditivo_id: number;
    insumo_id: number;
    nombre_completo: string;
    numero_ins: string | null;
    texto_formateado: string;
}

export interface GrupoAditivosRotulo {
    clase_funcional_id: number;
    clase_funcional: string;
    es_aromatizante: boolean;
    texto_grupo: string;
    aditivos: AditivoRotuloItem[];
}

export interface ListaIngredientesRotulo {
    receta_id: number;
    version: number;
    es_orden_manual: boolean;
    orden_manual_por: { id: number; nombre: string; apellido: string} | null;
    orden_manual_fecha: string | null;
    aviso_orden_anterior: string | null;
    formato_aditivos: FormatoDeclaracionAditivos;
    ingredientes: IngredienteRotuloItem[];
    grupos_aditivos: GrupoAditivosRotulo[];
    texto_rotulo: string;
}