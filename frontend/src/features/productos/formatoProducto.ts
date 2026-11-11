import type { TipoProducto } from '../../types/productos';

export const TIPOS_PRODUCTO: TipoProducto[] = ['alimento', 'bebida'];

export const ETIQUETA_TIPO_PRODUCTO: Record<TipoProducto, string> = {
    alimento: 'Alimento',
    bebida: 'Bebida analcohólica',
};

export function formatearCantidad(valor: number, unidad?: string): string {
    const numero = valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
    return unidad ? `${numero} ${unidad.toLowerCase()}` : numero;
}

export function formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.split('-');
    return `${dia}/${mes}/${anio}`;
}

export function fechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

export function hoyLocal(): string {
    return fechaLocal(new Date());
}
