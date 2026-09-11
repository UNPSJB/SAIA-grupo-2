import styles from './Boton.module.css';

interface BotonProps {
    children?: React.ReactNode; // <-- El "?" lo hace opcional (ya no es obligatorio pasarle texto)
    variant: 'guardar' | 'eliminar' | 'editar' | 'crear' | 'ver' | 'volver' | 'siguiente';
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
}

export default function Boton({ children, variant, onClick, type = 'button', disabled = false }: BotonProps) {
    
    const renderIcono = () => {
        // Si hay texto, le ponemos margen. Si no hay texto (solo ícono), quitamos el margen para que quede centrado.
        const estiloIcono = { marginRight: children ? '6px' : '0' };

        switch (variant) {
            case 'eliminar':
                return <i className="bi bi-trash" style={estiloIcono}></i>;
            case 'editar':
                return <i className="bi bi-pencil" style={estiloIcono}></i>;
            case 'ver':
                return <i className="bi bi-eye" style={estiloIcono}></i>;
            case 'crear':
                return <i className="bi bi-plus-circle" style={estiloIcono}></i>;
            case 'guardar':
                return <i className="bi bi-floppy" style={estiloIcono}></i>;
            case 'volver':
                return <i className="bi bi-arrow-left" style={estiloIcono}></i>;
            case 'siguiente':
                return <i className="bi bi-arrow-right" style={estiloIcono}></i>;
            default:
                return null;
        }
    };

    return (
        <button 
            type={type} 
            className={`${styles.base} ${styles[variant]}`} 
            onClick={onClick}
            disabled={disabled}
            style={{ 
                opacity: disabled ? 0.5 : 1, 
                cursor: disabled ? 'not-allowed' : 'pointer' 
            }}
        >
            {renderIcono()}
            {children}
        </button>
    );
}