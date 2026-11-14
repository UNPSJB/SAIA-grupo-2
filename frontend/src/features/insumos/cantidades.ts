import type { MagnitudUnidad, UnidadMedida } from '../../types/unidadesMedida';

export const MAGNITUDES_INSUMO: MagnitudUnidad[] = ['masa', 'volumen'];

const ML_POR_LITRO = 1000;

export function esUnidadDeInsumo(unidad: UnidadMedida): boolean {
    return MAGNITUDES_INSUMO.includes(unidad.magnitud);
}

export function unidadesCompatibles(unidades: UnidadMedida[], magnitud: MagnitudUnidad): UnidadMedida[] {
    return unidades.filter((unidad) => unidad.magnitud === magnitud);
}

export function unidadBase(unidades: UnidadMedida[], magnitud: MagnitudUnidad): UnidadMedida | undefined {
    return unidades.find((unidad) => unidad.magnitud === magnitud && unidad.factor_base === 1);
}

export function convertirABase(cantidad: number, unidad: UnidadMedida): number {
    return Math.round(cantidad * unidad.factor_base * 100) / 100;
}

export function simboloBase(magnitud: MagnitudUnidad): string {
    return magnitud === 'volumen' ? 'ml' : 'g';
}

export function simboloDeStock(magnitud: MagnitudUnidad): string {
    return magnitud === 'volumen' ? 'L' : 'g';
}

export function formatearStock(cantidadBase: number, magnitud: MagnitudUnidad): string {
    if (magnitud === 'volumen') {
        const litros = (cantidadBase / ML_POR_LITRO).toLocaleString('es-AR', { maximumFractionDigits: 3 });
        return `${litros} L`;
    }
    return `${cantidadBase.toLocaleString('es-AR', { maximumFractionDigits: 2 })} g`;
}

export function porCadaCien(magnitud: MagnitudUnidad): string {
    return magnitud === 'volumen' ? '100 ml' : '100 g';
}
