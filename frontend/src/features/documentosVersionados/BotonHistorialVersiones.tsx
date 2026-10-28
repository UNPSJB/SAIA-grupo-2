import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import HistorialVersionesModal from './HistorialVersionesModal';

interface BotonHistorialVersionesProps {
    documentoId: number;
    documentoNombre?: string;
    texto?: string;
    style?: React.CSSProperties;
}

export default function BotonHistorialVersiones({
    documentoId,
    documentoNombre,
    texto = 'Historial de versiones',
    style,
}: BotonHistorialVersionesProps) {
    const { usuario } = useAuth();
    const [modalAbierto, setModalAbierto] = useState(false);

    // Si el usuario no es administrador, no se muestra el botón (regla de seguridad de la HU)
    if (usuario?.rol !== 'admin') {
        return null;
    }

    return (
        <>
            <Boton
                variant="documentos"
                onClick={() => setModalAbierto(true)}
                style={style}
                title={`Ver historial de versiones de ${documentoNombre || 'documento'}`}
            >
                {texto}
            </Boton>

            {modalAbierto && (
                <HistorialVersionesModal
                    documentoId={documentoId}
                    documentoNombre={documentoNombre}
                    onClose={() => setModalAbierto(false)}
                />
            )}
        </>
    );
}
