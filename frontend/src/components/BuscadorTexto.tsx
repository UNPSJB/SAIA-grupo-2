import styles from './BuscadorTexto.module.css';

interface BuscadorTextoProps {
    valor: string;
    onCambio: (valor: string) => void;
    placeholder?: string;
    ancho?: string;
}

export default function BuscadorTexto({
    valor,
    onCambio,
    placeholder = 'Buscar...',
    ancho,
}: BuscadorTextoProps) {
    return (
        <div className={styles.contenedor} style={ancho ? { maxWidth: ancho } : undefined}>
            <i className={`bi bi-search ${styles.lupa}`}></i>
            <input
                type="search"
                className={styles.campo}
                value={valor}
                placeholder={placeholder}
                onChange={(e) => onCambio(e.target.value)}
                aria-label={placeholder}
            />
            {valor && (
                <button
                    type="button"
                    className={styles.limpiar}
                    onClick={() => onCambio('')}
                    title="Limpiar búsqueda"
                    aria-label="Limpiar búsqueda"
                >
                    <i className="bi bi-x-lg"></i>
                </button>
            )}
        </div>
    );
}
