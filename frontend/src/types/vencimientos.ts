export type CategoriaVencimiento =
    | 'personal'
    | 'documentos'
    | 'equipos'
    | 'calibracion';

export type EstadoVencimiento = 'vencido' | 'proximo' | 'vigente';

export interface ItemVencimientoConsolidado {
    id: string;
    categoria: CategoriaVencimiento;
    categoria_label: string;
    titulo: string;
    detalle: string;
    referencia?: string | null;
    fecha_vencimiento: string;
    dias_restantes: number;
    estado: EstadoVencimiento;
    bloqueado: boolean;
}

export interface ResumenVencimientos {
    total: number;
    vencidos: number;
    proximos: number;
    vigentes: number;
    items: ItemVencimientoConsolidado[];
}
