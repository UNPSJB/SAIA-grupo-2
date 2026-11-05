import Boton from './Boton';
import styles from '../styles/shared.module.css';

interface ModalConfirmacionProps {
    isOpen: boolean;
    titulo: string;
    mensaje: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ModalConfirmacion({ isOpen, titulo, mensaje, onConfirm, onCancel }: ModalConfirmacionProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3>{titulo}</h3>
                <p>{mensaje}</p>
                
                <div className={styles.filaBotones}>
                    <Boton variant="volver" onClick={onCancel}>
                        Cancelar
                    </Boton>
                    <Boton variant="eliminar" onClick={onConfirm}>
                        Eliminar
                    </Boton>
                </div>
            </div>
        </div>
    );
}