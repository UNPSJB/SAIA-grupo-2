import styles from '../styles/shared.module.css';

export interface Metrica {
    id: string;
    titulo: string;
    valor: number;
    color: string;
}

interface TarjetasFiltroProps {
    metricas: Metrica[];
    filtroActual: string;
    onFiltroChange: (id: string) => void;
}

export default function TarjetasFiltro({
    metricas,
    filtroActual,
    onFiltroChange
}: TarjetasFiltroProps) {
    return (
        <div
            className={styles.tarjetaEstatica}
            style={{
                width: '100%',
                maxWidth: '1100px',
                marginBottom: '25px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                padding: '10px',
                textAlign: 'center',
                alignItems: 'center',
                boxSizing: 'border-box',
            }}
        >
            {metricas.map((metrica) => {
                const colorActivo = `${metrica.color}40`; 
                const colorHover = `${metrica.color}20`;  

                return (
                    <div 
                        key={metrica.id}
                        onClick={() => onFiltroChange(filtroActual === metrica.id ? '' : metrica.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colorHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = filtroActual === metrica.id ? colorActivo : 'transparent'}
                        style={{ 
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            backgroundColor: filtroActual === metrica.id ? colorActivo : 'transparent',
                            transition: 'background-color 0.2s',
                        }}
                    >
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {metrica.titulo}
                        </span>
                        <h3 style={{ fontSize: '1.6rem', margin: '5px 0 0 0', color: metrica.color }}>
                            {metrica.valor}
                        </h3>
                    </div>
                );
            })}
        </div>
    );
}
