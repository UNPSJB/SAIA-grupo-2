import type { ItemVencimientoConsolidado } from '../types/vencimientos';

export function rutaDeVencimiento(item: Pick<ItemVencimientoConsolidado, 'id' | 'categoria'>): string {
    // const id = item.id.split('-').slice(1).join('-');
    //lo cambie por que si por alguna razon el empleado tenia dos libretas se rompia y no cargaba nada por que apuntaba a un numero vacio o a otro que no era 
    const id = item.id.split('-')[1];
    if (item.categoria === 'personal' || item.categoria === 'documentos') return `/empleados/${id}`;
    if (item.categoria === 'equipos') return `/elementosLimpieza/${id}`;
    return `/equipos/${id}`;
}

export function textoDiasRestantes(dias: number): string {
    if (dias < 0) return `venció hace ${-dias} ${dias === -1 ? 'día' : 'días'}`;
    if (dias === 0) return 'vence hoy';
    return `vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
