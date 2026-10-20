import styles from '../styles/shared.module.css';

export interface Metrica {
    id: string;      // El valor por el que vamos a filtrar (ej: 'vencido', 'activos', '')
    titulo: string;  // El texto que se lee arriba (ej: 'ACTIVOS')
    valor: number;   // El número grande
    color: string;   // El color en HEX o var(--color)
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                padding: '10px',
                textAlign: 'center',
                alignItems: 'center',
            }}
        >
            {metricas.map((metrica) => {
                // Generamos las opacidades dinámicamente según el color pasado
                const colorActivo = `${metrica.color}40`; 
                const colorHover = `${metrica.color}20`;  

                return (
                    <div 
                        key={metrica.id}
                        onClick={() => onFiltroChange(metrica.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colorHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = filtroActual === metrica.id ? colorActivo : 'transparent'}
                        style={{ 
                            padding: '10px 15px', 
                            cursor: 'pointer',
                            borderRadius: '8px',
                            backgroundColor: filtroActual === metrica.id ? colorActivo : 'transparent',
                            transition: 'background-color 0.2s',
                        }}
                    >
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {metrica.titulo}
                        </span>
                        <h3 style={{ fontSize: '1.8rem', margin: '5px 0 0 0', color: metrica.color }}>
                            {metrica.valor}
                        </h3>
                    </div>
                );
            })}
        </div>
    );
}