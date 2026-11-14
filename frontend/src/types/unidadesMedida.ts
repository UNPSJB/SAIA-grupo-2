export type MagnitudUnidad = 'masa' | 'volumen' | 'cantidad';

export interface UnidadMedida {
    id: number;
    nombre: string;
    magnitud: MagnitudUnidad;
    factor_base: number;
}
