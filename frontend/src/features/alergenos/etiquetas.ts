import type { Alergeno } from '../../types/alergenos';

export const ALERGENOS: Alergeno[] = [
    'trigo',
    'centeno',
    'cebada',
    'avena',
    'crustaceos',
    'huevo',
    'pescado',
    'mani',
    'soja',
    'leche',
    'frutas_secas',
    'sulfitos',
];

export const CEREALES_CON_GLUTEN: Alergeno[] = ['trigo', 'centeno', 'cebada', 'avena'];

export const ETIQUETA_ALERGENO: Record<Alergeno, string> = {
    trigo: 'Trigo',
    centeno: 'Centeno',
    cebada: 'Cebada',
    avena: 'Avena',
    crustaceos: 'Crustáceos',
    huevo: 'Huevo',
    pescado: 'Pescado',
    mani: 'Maní',
    soja: 'Soja',
    leche: 'Leche',
    frutas_secas: 'Frutas secas',
    sulfitos: 'Sulfitos',
};

export const AYUDA_ALERGENO: Partial<Record<Alergeno, string>> = {
    sulfitos: 'Dióxido de azufre y sulfitos: se declaran desde 10 mg/kg (10 ppm) en el producto.',
    frutas_secas: 'Nueces, almendras, avellanas, castañas, pistachos y similares.',
};

export function listarAlergenos(alergenos: Alergeno[]): string {
    return alergenos.map((alergeno) => ETIQUETA_ALERGENO[alergeno]).join(', ');
}

export const NOMBRE_EN_ROTULO: Record<Alergeno, string> = {
    trigo: 'TRIGO',
    centeno: 'CENTENO',
    cebada: 'CEBADA',
    avena: 'AVENA',
    crustaceos: 'CRUSTÁCEOS',
    huevo: 'HUEVO',
    pescado: 'PESCADO',
    mani: 'MANÍ',
    soja: 'SOJA',
    leche: 'LECHE',
    frutas_secas: 'FRUTAS SECAS',
    sulfitos: 'SULFITOS',
};

export function leyendaAlergenos(prefijo: string, alergenos: Alergeno[]): string | null {
    if (alergenos.length === 0) return null;
    const nombres = ALERGENOS.filter((alergeno) => alergenos.includes(alergeno)).map(
        (alergeno) => NOMBRE_EN_ROTULO[alergeno],
    );
    const enumeracion =
        nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} Y ${nombres[nombres.length - 1]}`;
    return `${prefijo} ${enumeracion}.`;
}
