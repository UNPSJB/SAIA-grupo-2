import type { EstadoTablaNutricional } from '../../types/datosNutricionales';
import estilos from './DatosNutricionales.module.css';

interface Props {
    estado: EstadoTablaNutricional | string;
    className?: string;
}

export default function InsigniaEstadoNutricional({ estado, className = '' }: Props) {
    const esCompleta = estado === 'completa';
    return (
        <span
            className={`${estilos.estadoRotulo} ${esCompleta ? estilos.estadoCompleta : estilos.estadoIncompleta} ${className}`}
            role="status"
        >
            {esCompleta ? 'Tabla completa' : 'Tabla incompleta'}
        </span>
    );
}