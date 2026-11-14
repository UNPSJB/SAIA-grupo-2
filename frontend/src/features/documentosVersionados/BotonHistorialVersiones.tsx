import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import HistorialVersionesModal from './HistorialVersionesModal';

interface BotonHistorialVersionesProps {
    documentoId: number;
    documentoNombre?: string;
    texto?: string;
    style?: React.CSSProperties;
    onVersionVigenteCambiada?: () => void;
}

export default function BotonHistorialVersiones({
    documentoId,
    documentoNombre,
    texto = '',
    style,
    onVersionVigenteCambiada,
}: BotonHistorialVersionesProps) {
    const { usuario } = useAuth();
    const [modalAbierto, setModalAbierto] = useState(false);

    
    if (usuario?.rol !== 'admin') {
        return null;
    }

    const tooltip = documentoNombre 
    ? `Historial de versiones de "${documentoNombre}"` 
    : 'Historial de versiones';

    return (
        <>
            <Boton
                variant="documentos"
                onClick={() => setModalAbierto(true)}
                style={style}
                title={tooltip} // Tooltip descriptivo
            >
                {texto}
            </Boton>

            {modalAbierto && (
                <HistorialVersionesModal
                    documentoId={documentoId}
                    documentoNombre={documentoNombre}
                    onClose={() => setModalAbierto(false)}
                    onVersionVigenteCambiada={onVersionVigenteCambiada}
                />
            )}
        </>
    );
}
