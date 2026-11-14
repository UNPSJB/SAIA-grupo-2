import type { UnidadMedida } from '../../types/unidadesMedida';
import styles from './CampoCantidad.module.css';

interface CampoCantidadProps {
    id: string;
    etiqueta: string;
    cantidad: string;
    unidadId: string;
    unidades: UnidadMedida[];
    onCambiarCantidad: (valor: string) => void;
    onCambiarUnidad: (valor: string) => void;
    ayuda?: string;
    error?: string;
    autoFocus?: boolean;
}

export default function CampoCantidad({
    id,
    etiqueta,
    cantidad,
    unidadId,
    unidades,
    onCambiarCantidad,
    onCambiarUnidad,
    ayuda,
    error,
    autoFocus = false,
}: CampoCantidadProps) {
    return (
        <div className={styles.campo}>
            <label htmlFor={id}>{etiqueta}</label>
            <div className={styles.fila}>
                <input
                    id={id}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ej: 500"
                    value={cantidad}
                    autoFocus={autoFocus}
                    aria-invalid={Boolean(error)}
                    onChange={(e) => onCambiarCantidad(e.target.value)}
                />
                <select
                    aria-label={`Unidad de ${etiqueta.toLowerCase()}`}
                    value={unidadId}
                    disabled={unidades.length === 0}
                    onChange={(e) => onCambiarUnidad(e.target.value)}
                >
                    {unidades.map((unidad) => (
                        <option key={unidad.id} value={String(unidad.id)}>
                            {unidad.nombre}
                        </option>
                    ))}
                </select>
            </div>
            {error
                ? <span className={styles.error} role="alert">{error}</span>
                : ayuda && <span className={styles.ayuda}>{ayuda}</span>}
        </div>
    );
}
