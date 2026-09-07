import styles from './Boton.module.css';

interface BotonProps {
    children: React.ReactNode; // Permite pasar texto o iconos por dentro
    variant: 'guardar' | 'eliminar' | 'editar' | 'crear';
    onClick?: () => void;
    type?: 'button' | 'submit';
}

export default function Boton({ children, variant, onClick, type = 'button' }: BotonProps) {
    return (
        <button 
            type={type} 
            className={`${styles.base} ${styles[variant]}`} 
            onClick={onClick}
        >
            {children}
        </button>
    );
}