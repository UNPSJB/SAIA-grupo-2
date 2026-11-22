import type { EmpleadoResumen } from './documentacion';
import type { TipoProducto } from './productos';

export type Alergeno =
    | 'trigo'
    | 'centeno'
    | 'cebada'
    | 'avena'
    | 'crustaceos'
    | 'huevo'
    | 'pescado'
    | 'mani'
    | 'soja'
    | 'leche'
    | 'frutas_secas'
    | 'sulfitos';

export type EstadoDeclaracion = 'sugerida' | 'confirmada';

export type UnidadDuracion = 'dias' | 'meses';

export interface MarcaAlergenos {
    alergenos: Alergeno[];
    contiene_gluten: boolean;
}

export interface InsumoResumen {
    id: number;
    nombre: string;
}

export interface MarcaAlergenosInsumo extends MarcaAlergenos {
    insumo: InsumoResumen;
    revisado: boolean;
    fecha_cambio: string | null;
    cambiado_por: EmpleadoResumen | null;
}

export interface CambioMarcaAlergenos extends MarcaAlergenos {
    insumo_id: number;
}

export interface AlergenoPropuesto {
    alergeno: Alergeno;
    insumos: string[];
}

export interface PropuestaAlergenos {
    tiene_receta: boolean;
    version_receta: number | null;
    contiene: AlergenoPropuesto[];
    contiene_gluten: boolean;
    insumos_con_gluten: string[];
    insumos_sin_revisar: InsumoResumen[];
}

export interface DeclaracionAlergenos {
    contiene: Alergeno[];
    contiene_gluten: boolean;
    puede_contener: Alergeno[];
    estado: EstadoDeclaracion;
    version_receta: number | null;
    modificada_respecto_de_la_propuesta: boolean;
    fecha_modificacion: string;
    modificado_por: EmpleadoResumen;
    fecha_confirmacion: string | null;
    confirmado_por: EmpleadoResumen | null;
}

export interface DatosDeclaracion {
    contiene: Alergeno[];
    contiene_gluten: boolean;
    puede_contener: Alergeno[];
    confirmar: boolean;
}

export interface DatosConservacion {
    temperatura_minima: number | null;
    temperatura_maxima: number | null;
    duracion: number | null;
    unidad_duracion: UnidadDuracion;
    instrucciones: string | null;
}

export interface CondicionesConservacion extends DatosConservacion {
    fecha_modificacion: string;
    modificado_por: EmpleadoResumen;
}

export interface LeyendasAlergenos {
    contiene: string | null;
    puede_contener: string | null;
    conservacion: string | null;
}

export interface ProductoAlergenos {
    id: number;
    nombre: string;
    tipo: TipoProducto;
}

export interface DetalleAlergenosProducto {
    producto: ProductoAlergenos;
    propuesta: PropuestaAlergenos;
    declaracion: DeclaracionAlergenos | null;
    propuesta_cambio: boolean;
    conservacion: CondicionesConservacion | null;
    leyendas: LeyendasAlergenos;
}

export interface ResumenAlergenosProducto {
    producto: ProductoAlergenos;
    tiene_receta: boolean;
    estado: EstadoDeclaracion;
    guardada: boolean;
    propuesta_cambio: boolean;
    contiene: Alergeno[];
    contiene_gluten: boolean;
    puede_contener: Alergeno[];
    leyenda_conservacion: string | null;
}
