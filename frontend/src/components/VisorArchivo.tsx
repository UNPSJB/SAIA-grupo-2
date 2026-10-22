import { esImagen } from '../constants/archivos';
import { abrirArchivoEnPestania } from '../utils/archivos';
import styles from './VisorArchivo.module.css';

interface VisorArchivoProps {
    url: string;
    nombre?: string | null;
    alto?: string;
    acciones?: React.ReactNode;
}

const ES_PDF = /^data:application\/pdf|\.pdf(?:[?#]|$)/i;
const ES_IMAGEN_POR_EXTENSION = /\.(png|jpe?g|gif|webp|svg)(?:[?#]|$)/i;

export default function VisorArchivo({
    url,
    nombre,
    alto = '70vh',
    acciones,
}: VisorArchivoProps) {
    const mostrarComoImagen = esImagen(url) || ES_IMAGEN_POR_EXTENSION.test(url);
    const mostrarComoDocumento = ES_PDF.test(url) || url.startsWith('http');

    return (
        <div className={styles.contenedor}>
            <div className={styles.barra}>
                <span className={styles.nombre}>{nombre ?? ''}</span>
                <div className={styles.acciones}>
                    {acciones}
                    <button
                        type="button"
                        onClick={() => abrirArchivoEnPestania(url, nombre)}
                        className={styles.abrir}
                        title="Abrir en una pestaña nueva"
                    >
                        <i className="bi bi-box-arrow-up-right"></i>
                        Abrir en pestaña nueva
                    </button>
                </div>
            </div>

            <div className={styles.marco} style={{ height: alto }}>
                {mostrarComoImagen ? (
                    <img
                        src={url}
                        alt={nombre ?? 'Archivo adjunto'}
                        className={styles.imagen}
                        style={{ height: alto }}
                    />
                ) : mostrarComoDocumento ? (
                    <iframe
                        src={url}
                        title={nombre ?? 'Archivo adjunto'}
                        className={styles.documento}
                        style={{ height: alto }}
                    />
                ) : (
                    <p className={styles.sinVista}>
                        No se puede previsualizar este formato. Usá "Abrir en pestaña nueva".
                    </p>
                )}
            </div>
        </div>
    );
}
