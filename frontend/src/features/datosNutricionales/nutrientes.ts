import type { FuenteDatoNutricional, Nutriente } from '../../types/datosNutricionales';
import type { EmpleadoResumen } from '../../types/documentacion';

export interface DefinicionNutriente {
    id: Nutriente;
    etiqueta: string;
    unidad: string;
    subnivel: boolean;
}

export const NUTRIENTES: DefinicionNutriente[] = [
    { id: 'energia', etiqueta: 'Valor energético', unidad: 'kcal', subnivel: false },
    { id: 'carbohidratos', etiqueta: 'Carbohidratos', unidad: 'g', subnivel: false },
    { id: 'azucares_totales', etiqueta: 'Azúcares totales', unidad: 'g', subnivel: true },
    { id: 'azucares_anadidos', etiqueta: 'Azúcares añadidos', unidad: 'g', subnivel: true },
    { id: 'proteinas', etiqueta: 'Proteínas', unidad: 'g', subnivel: false },
    { id: 'grasas_totales', etiqueta: 'Grasas totales', unidad: 'g', subnivel: false },
    { id: 'grasas_saturadas', etiqueta: 'Grasas saturadas', unidad: 'g', subnivel: true },
    { id: 'grasas_trans', etiqueta: 'Grasas trans', unidad: 'g', subnivel: true },
    { id: 'fibra_alimentaria', etiqueta: 'Fibra alimentaria', unidad: 'g', subnivel: false },
    { id: 'sodio', etiqueta: 'Sodio', unidad: 'mg', subnivel: false },
];

export const NUTRIENTES_SARA2: Nutriente[] = ['azucares_totales', 'azucares_anadidos', 'grasas_trans'];

export const FUENTES: FuenteDatoNutricional[] = ['sara', 'rotulo_proveedor', 'bibliografia', 'valor_propio'];

export const ETIQUETA_FUENTE: Record<FuenteDatoNutricional, string> = {
    sara: 'Base SARA 2',
    rotulo_proveedor: 'Rótulo del proveedor',
    bibliografia: 'Otra bibliografía',
    valor_propio: 'Valor propio',
};

export const FUENTES_MANUALES = FUENTES.filter((fuente) => fuente !== 'sara');

export function formatearValor(valor: number): string {
    return valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export function formatearFechaHora(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    const dia = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return `${dia} ${hora}`;
}

export function nombreCompleto(empleado: EmpleadoResumen): string {
    return `${empleado.nombre} ${empleado.apellido}`;
}
