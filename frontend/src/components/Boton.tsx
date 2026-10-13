import React from 'react';
import styles from './Boton.module.css';

interface BotonProps {
    children?: React.ReactNode; 
    variant: 'guardar' | 'eliminar' | 'editar' | 'crear' | 'ver' | 'volver' | 'siguiente' | 'buscar' | 'documentos';
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
    style?: React.CSSProperties; 
    title?: string;
}

export default function Boton({ children, variant, onClick, type = 'button', disabled = false, style, title }: BotonProps) {
    
    const renderIcono = () => {
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
            case 'buscar':
                return <i className="bi bi-search" style={estiloIcono}></i>;
            case 'documentos':
                return <i className="bi bi-file-earmark" style={estiloIcono}></i>;
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
            style={style}
            title={title}
        >
            {renderIcono()}
            {children}
        </button>
    );
}