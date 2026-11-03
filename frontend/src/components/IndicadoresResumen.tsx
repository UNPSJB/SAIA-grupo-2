import styles from './Estadisticas.module.css';

export interface Indicador {
    titulo: string;
    valor: string | number;
    detalle?: string;
}

export default function IndicadoresResumen({ indicadores }: { indicadores: Indicador[] }) {
    return (
        <div className={styles.indicadores}>
            {indicadores.map((indicador) => (
                <div key={indicador.titulo} className={styles.indicador}>
                    <span className={styles.indicadorTitulo}>{indicador.titulo}</span>
                    <span className={styles.indicadorValor}>{indicador.valor}</span>
                    {indicador.detalle && (
                        <span className={styles.indicadorDetalle}>{indicador.detalle}</span>
                    )}
                </div>
            ))}
        </div>
    );
}
