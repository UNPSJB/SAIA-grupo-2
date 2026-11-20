import type {
    Agregado,
    CondicionCriterio,
    CriterioSello,
    EstadoConjunto,
    SelloAdvertencia,
} from '../../types/parametrosNormativos';
import type { EvaluacionRotulado, MarcasAgregados, ResultadoAplicabilidad } from '../../types/rotuladoFrontal';

export const SELLOS: SelloAdvertencia[] = [
    'exceso_azucares',
    'exceso_grasas_totales',
    'exceso_grasas_saturadas',
    'exceso_sodio',
    'exceso_calorias',
    'contiene_edulcorantes',
    'contiene_cafeina',
];

export const ETIQUETA_SELLO: Record<SelloAdvertencia, string> = {
    exceso_azucares: 'Exceso en azúcares',
    exceso_grasas_totales: 'Exceso en grasas totales',
    exceso_grasas_saturadas: 'Exceso en grasas saturadas',
    exceso_sodio: 'Exceso en sodio',
    exceso_calorias: 'Exceso en calorías',
    contiene_edulcorantes: 'Leyenda de edulcorantes',
    contiene_cafeina: 'Leyenda de cafeína',
};

export const ETIQUETA_SELLO_CORTA: Record<SelloAdvertencia, string> = {
    exceso_azucares: 'Azúcares',
    exceso_grasas_totales: 'Grasas totales',
    exceso_grasas_saturadas: 'Grasas saturadas',
    exceso_sodio: 'Sodio',
    exceso_calorias: 'Calorías',
    contiene_edulcorantes: 'Leyenda edulcorantes',
    contiene_cafeina: 'Leyenda cafeína',
};

export const AGREGADOS: Agregado[] = ['azucares', 'grasas', 'sodio', 'edulcorantes', 'cafeina'];

export const ETIQUETA_AGREGADO: Record<Agregado, string> = {
    azucares: 'Azúcares agregados',
    grasas: 'Grasas agregadas',
    sodio: 'Sodio agregado',
    edulcorantes: 'Contiene edulcorantes',
    cafeina: 'Contiene cafeína',
};

export const ETIQUETA_ESTADO_CONJUNTO: Record<EstadoConjunto, string> = {
    borrador: 'Borrador',
    publicado: 'Publicada',
};

export function describirCondicion(condicion: CondicionCriterio, kcalSinAporte?: number): string {
    if (condicion === 'con_sello_de_energia') return 'Solo si ya lleva sello de azúcares o de grasas';
    if (condicion === 'sin_aporte_energetico') {
        const limite = kcalSinAporte !== undefined ? ` (hasta ${formatearNumero(kcalSinAporte)} kcal por porción)` : '';
        return `Solo bebidas sin aporte energético${limite}`;
    }
    return '';
}

export function describirCriterio(criterio: CriterioSello): string {
    if (criterio.forma === 'porcentaje_energia') {
        return `${criterio.unidad} (${formatearNumero(criterio.factor_energetico ?? 0)} kcal por gramo)`;
    }
    return criterio.unidad;
}

export function formatearNumero(valor: number): string {
    return valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export interface DescripcionResultado {
    titulo: string;
    detalle: string;
    tono: 'alerta' | 'neutro' | 'exito';
}

export const RESULTADO: Record<ResultadoAplicabilidad, DescripcionResultado> = {
    corresponde: {
        titulo: 'Corresponde rotulado frontal',
        detalle: 'Hay que evaluar los sellos y leyendas que se indican.',
        tono: 'alerta',
    },
    sin_agregados: {
        titulo: 'Exceptuado',
        detalle: 'No tiene azúcares, grasas ni sodio agregados, ni contiene edulcorantes o cafeína.',
        tono: 'exito',
    },
    exceptuado: {
        titulo: 'Exceptuado por categoría',
        detalle: 'El producto pertenece a una categoría exceptuada por la norma.',
        tono: 'exito',
    },
    no_envasado: {
        titulo: 'No aplica',
        detalle: 'No se envasa en ausencia del cliente: no corresponde rotulado frontal ni se calculan sellos.',
        tono: 'neutro',
    },
};

export const CAMPO_AGREGADO: Record<Agregado, keyof MarcasAgregados> = {
    azucares: 'agrega_azucares',
    grasas: 'agrega_grasas',
    sodio: 'agrega_sodio',
    edulcorantes: 'contiene_edulcorantes',
    cafeina: 'contiene_cafeina',
};

export const ETIQUETA_AGREGADO_CORTA: Record<Agregado, string> = {
    azucares: 'Azúcares',
    grasas: 'Grasas',
    sodio: 'Sodio',
    edulcorantes: 'Edulcorantes',
    cafeina: 'Cafeína',
};

export function origenDeMarcas(evaluacion: EvaluacionRotulado): string {
    if (evaluacion.version_receta === null) return 'Cargadas a mano';
    if (evaluacion.marcas_corregidas) return `Corregidas sobre la receta v${evaluacion.version_receta}`;
    return `Según la receta v${evaluacion.version_receta}`;
}
