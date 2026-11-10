import type { Producto } from '../../types/productos';
import FormularioProducto from './FormularioProducto';
import styles from '../../styles/shared.module.css';

interface NuevoProductoModalProps {
    onCreado: (producto: Producto) => void;
    onClose: () => void;
}

export default function NuevoProductoModal({ onCreado, onClose }: NuevoProductoModalProps) {
    return (
        <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={(evento) => {
                if (evento.target === evento.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-nuevo-producto"
                className={styles.modalFormulario}
                style={{ maxWidth: '640px' }}
            >
                <h2 id="titulo-nuevo-producto" style={{ marginTop: 0, color: 'var(--text-h)' }}>
                    Nuevo producto
                </h2>
                <p className={styles.textMuted} style={{ marginTop: '-6px' }}>
                    Queda guardado en el listado de productos y seleccionado para este lote.
                </p>
                <FormularioProducto enModal onGuardado={onCreado} onCancelar={onClose} />
            </section>
        </div>
    );
}
