import Boton from './Boton';
import styles from '../styles/shared.module.css';

interface ModalAlertaProps {
    isOpen: boolean;
    titulo: string;
    mensaje: string;
    tipo?: 'exito' | 'error' | 'info'; 
    onClose: () => void;
}

export default function ModalAlerta({ isOpen, titulo, mensaje, tipo, onClose }: ModalAlertaProps) {
    if (!isOpen) return null;

    return (
       <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3>{titulo}</h3>
                {tipo && (
                    <div style={{ margin: '16px 0', fontSize: '3.5rem', lineHeight: 1 }}>
                        {tipo === 'exito' && (
                            <i className="bi bi-check-circle-fill" style={{ color: 'var(--verde-texto)' }}></i>
                        )}
                        {tipo === 'error' && (
                            <i className="bi bi-x-circle-fill" style={{ color: 'var(--rojo-texto)' }}></i>
                        )}
                        {tipo === 'info' && (
                            <i className="bi bi-info-circle-fill" style={{ color: 'var(--azul-texto)' }}></i>
                        )}
                    </div>
                )}

                <p>{mensaje}</p>
                
                <div className={styles.filaBotones} style={{ justifyContent: 'center' }}>
                    <Boton variant="volver" onClick={onClose}>
                        Aceptar
                    </Boton>
                    {/* <Boton variant={tipo === 'exito' ? "guardar" : "volver"} onClick={onClose}>
                        Aceptar
                    </Boton> */}
                </div>
            </div>
        </div>
    );
}