const LARGO_MAXIMO_BUSCABLE = 300;
const PROFUNDIDAD_MAXIMA = 3;
const SUFIJOS_IGNORADOS = ['_url'];

export function normalizarTexto(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

export function valoresBuscables(valor: unknown, profundidad = 0): Array<string | number> {
    if (valor === null || valor === undefined || profundidad > PROFUNDIDAD_MAXIMA) return [];
    if (typeof valor === 'number') return Number.isFinite(valor) ? [valor] : [];
    if (typeof valor === 'string') return valor.length <= LARGO_MAXIMO_BUSCABLE ? [valor] : [];
    if (typeof valor === 'boolean') return [];

    if (Array.isArray(valor)) {
        return valor.flatMap((elemento) => valoresBuscables(elemento, profundidad + 1));
    }

    if (typeof valor === 'object') {
        return Object.entries(valor as Record<string, unknown>)
            .filter(([clave]) => !SUFIJOS_IGNORADOS.some((sufijo) => clave.endsWith(sufijo)))
            .flatMap(([, contenido]) => valoresBuscables(contenido, profundidad + 1));
    }

    return [];
}

export function filtrarPorTexto<T>(
    items: T[],
    busqueda: string,
    camposAdicionales?: (item: T) => Array<string | number | null | undefined>
): T[] {
    const buscado = normalizarTexto(busqueda);
    if (!buscado) return items;

    return items.filter((item) => {
        const valores: Array<string | number | null | undefined> = [
            ...valoresBuscables(item),
            ...(camposAdicionales ? camposAdicionales(item) : []),
        ];

        return valores.some((campo) =>
            campo !== null && campo !== undefined
                ? normalizarTexto(String(campo)).includes(buscado)
                : false
        );
    });
}
