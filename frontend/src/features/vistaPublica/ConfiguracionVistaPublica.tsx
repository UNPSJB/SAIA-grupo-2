import { useEffect, useState } from 'react';
import { getConfiguracionVistaPublica, updateConfiguracionVistaPublica } from '../../services/vistaPublicaServices';
import { QRCodeSVG } from 'qrcode.react';
import styles from '../../styles/shared.module.css';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';

export default function ConfiguracionVistaPublica() {
    const [activa, setActiva] = useState<boolean>(false);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    const vistaPublicaUrl = token ? `${window.location.origin}/publico/${token}` : '';

    useEffect(() => {
        cargarConfiguracion();
    }, []);

    const cargarConfiguracion = async () => {
        try {
            const conf = await getConfiguracionVistaPublica();
            setActiva(conf.activa);
            setToken(conf.token);
        } catch (err) {
            console.error("Error cargando configuración:", err);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'Ocurrió un error al cargar la configuración de la vista pública.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const nuevoEstado = e.target.checked;
        setLoading(true);
        try {
            const conf = await updateConfiguracionVistaPublica(nuevoEstado);
            setActiva(conf.activa);
            setToken(conf.token);
        } catch (err) {
            console.error("Error actualizando configuración:", err);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'Ocurrió un error al actualizar la configuración de la vista pública.'
            });
        } finally {
            setLoading(false);
        }
    };

    const copiarEnlace = () => {
        if (!vistaPublicaUrl) return;
        navigator.clipboard.writeText(vistaPublicaUrl);
        setModalAlerta({
            isOpen: true,
            titulo: 'Enlace Copiado',
            mensaje: 'El enlace de la vista pública ha sido copiado al portapapeles.'
        });
    };

    if (loading && !token) {
        return <div className={styles.contenedorPrincipal}>Cargando configuración...</div>;
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Configuración de Vista Pública"
                descripcion="Permite a los clientes escanear un QR o visitar un enlace para ver los indicadores globales de cumplimiento, sin detalles confidenciales."
            />

            <div className={styles.tarjeta}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className={styles.label}>Habilitar Vista Pública</h3>
                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Activa la generación del QR y el enlace de acceso público.</p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={activa}
                            onChange={handleToggle}
                            disabled={loading}
                            style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                        />
                    </label>
                </div>
            </div>

            {activa && vistaPublicaUrl && (
                <div className={styles.tarjeta} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 className={styles.label} style={{ marginBottom: '1.5rem' }}>Escanea el QR</h3>
                    <div style={{ padding: '1rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        <QRCodeSVG value={vistaPublicaUrl} size={200} level="H" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '500px' }}>
                        <input
                            type="text"
                            readOnly
                            value={vistaPublicaUrl}
                            className={styles.input}
                            style={{ flex: 1 }}
                        />
                        <Boton onClick={copiarEnlace} variant="crear">Copiar Enlace</Boton>
                    </div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>
                        Muestra este QR en el establecimiento o comparte el enlace. Si desactivas la vista pública, este enlace dejará de ser accesible inmediatamente.
                    </p>
                </div>
            )}

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}
