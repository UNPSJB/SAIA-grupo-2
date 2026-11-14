import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVistaPublicaByToken } from '../../services/vistaPublicaServices';
import type { VistaPublicaResumen } from '../../types/vistaPublica';
import VistaPublicaContenido from './VistaPublicaContenido';
import ModalAlerta from '../../components/alerta';

export default function VistaPublica() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [resumen, setResumen] = useState<VistaPublicaResumen | null>(null);
    const [cargando, setCargando] = useState<boolean>(true);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    useEffect(() => {
        if (!token) {
            mostrarErrorCaducado();
            return;
        }

        getVistaPublicaByToken(token)
            .then(data => {
                setResumen(data);
                setCargando(false);
            })
            .catch(err => {
                console.error("Error al consultar vista pública:", err);
                setCargando(false);
                mostrarErrorCaducado();
            });
    }, [token]);

    const mostrarErrorCaducado = () => {
        setModalAlerta({
            isOpen: true,
            titulo: 'Enlace Caducado',
            mensaje: 'Enlace caducado. Para ingresar de nuevo a la vista pública solicítelo a un administrador.'
        });
    };

    const handleCerrarAlerta = () => {
        setModalAlerta({ ...modalAlerta, isOpen: false });
        navigate('/', { replace: true });
    };

    if (cargando) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
                <span>Cargando vista pública...</span>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '2rem', paddingBottom: '2rem', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', maxWidth: '500px' }}>
                {resumen && <VistaPublicaContenido resumen={resumen} />}
            </div>

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={handleCerrarAlerta}
            />
        </div>
    );
}
