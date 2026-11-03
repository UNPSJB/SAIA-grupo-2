import styles from './Estadisticas.module.css';

export interface ItemBarra {
    clave: string;
    etiqueta: string;
    valor: number;
    detalle?: string;
}

interface ValorMostrado {
    principal: string;
    secundario?: string;
}

interface GraficoBarrasHorizontalesProps {
    items: ItemBarra[];
    seleccionado?: string | null;
    onSeleccionar?: (clave: string) => void;
    unidad?: (valor: number) => string;
    escala?: number;
    orden?: 'mayor' | 'menor' | 'original';
    mostrarValor?: (item: ItemBarra, total: number) => ValorMostrado;
    colores?: Record<string, string>;
}

const porDefecto = (item: ItemBarra, total: number): ValorMostrado => ({
    principal: String(item.valor),
    secundario: `${total > 0 ? Math.round((item.valor / total) * 100) : 0}%`,
});

export default function GraficoBarrasHorizontales({
    items,
    seleccionado = null,
    onSeleccionar,
    unidad,
    escala,
    orden = 'mayor',
    mostrarValor = porDefecto,
    colores,
}: GraficoBarrasHorizontalesProps) {
    const total = items.reduce((suma, item) => suma + item.valor, 0);
    const maximo = escala ?? Math.max(...items.map((item) => item.valor), 0);
    const ordenados =
        orden === 'original'
            ? items
            : [...items].sort((a, b) => (orden === 'mayor' ? b.valor - a.valor : a.valor - b.valor));
    const interactivo = Boolean(onSeleccionar);

    return (
        <ul className={styles.barras}>
            {ordenados.map((item) => {
                const ancho = maximo > 0 ? Math.min((item.valor / maximo) * 100, 100) : 0;
                const activo = seleccionado === item.clave;
                const atenuado = seleccionado !== null && !activo;
                const valor = mostrarValor(item, total);
                const descripcion = unidad ? unidad(item.valor) : valor.principal;
                const contenido = (
                    <>
                        <span className={styles.etiqueta}>{item.etiqueta}</span>
                        <span className={styles.pista} aria-hidden="true">
                            <span
                                className={`${styles.barra} ${atenuado ? styles.barraAtenuada : ''}`}
                                style={{
                                    width: `${ancho}%`,
                                    ...(colores?.[item.clave] && !atenuado ? { background: colores[item.clave] } : {}),
                                }}
                            />
                        </span>
                        <span className={styles.valor}>
                            <span className={styles.valorNumero}>{valor.principal}</span>
                            {valor.secundario && (
                                <span className={styles.valorPorcentaje}>{valor.secundario}</span>
                            )}
                        </span>
                    </>
                );

                return (
                    <li key={item.clave}>
                        {interactivo ? (
                            <button
                                type="button"
                                className={`${styles.fila} ${activo ? styles.filaSeleccionada : ''}`}
                                onClick={() => onSeleccionar?.(item.clave)}
                                aria-pressed={activo}
                                title={`${item.etiqueta}: ${descripcion}`}
                            >
                                {contenido}
                            </button>
                        ) : (
                            <div className={`${styles.fila} ${styles.filaEstatica}`} title={`${item.etiqueta}: ${descripcion}`}>
                                {contenido}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
