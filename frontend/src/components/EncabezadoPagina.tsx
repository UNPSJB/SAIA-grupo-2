import type { ReactNode } from 'react';

import estilos from './EncabezadoPagina.module.css';

interface EncabezadoPaginaProps {
    titulo: ReactNode;
    descripcion?: ReactNode;
    acciones?: ReactNode;
    ancho?: string;
}

export default function EncabezadoPagina({ titulo, descripcion, acciones, ancho = '1100px' }: EncabezadoPaginaProps) {
    return (
        <header className={estilos.encabezado} style={{ maxWidth: ancho }}>
            <div className={estilos.textos}>
                <h2 className={estilos.titulo}>{titulo}</h2>
                {descripcion && <p className={estilos.descripcion}>{descripcion}</p>}
            </div>
            {acciones && <div className={estilos.acciones}>{acciones}</div>}
        </header>
    );
}
