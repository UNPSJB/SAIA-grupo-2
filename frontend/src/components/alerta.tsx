import Boton from './Boton';
import styles from '../styles/shared.module.css';

interface ModalAlertaProps {
    isOpen: boolean;
    titulo: string;
    mensaje: string;
    onClose: () => void;
}

export default function ModalAlerta({ isOpen, titulo, mensaje, onClose }: ModalAlertaProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3 style={{ color: 'var(--text-h)', marginTop: 0 }}>{titulo}</h3>
                <p style={{ color: 'var(--text)', marginBottom: '25px' }}>{mensaje}</p>
                
                <div className={styles.filaBotones} style={{ justifyContent: 'center' }}>
                    <Boton variant="volver" onClick={onClose}>
                        Aceptar
                    </Boton>
                </div>
            </div>
        </div>
    );
}