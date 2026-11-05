import { useRef, useState } from 'react';
import VisorArchivo from './VisorArchivo';
import {
    TAMANIO_MAXIMO_BYTES,
    TAMANIO_MAXIMO_MB,
    TIPOS_ACEPTADOS,
    esTipoAceptado,
} from '../constants/archivos';
import styles from './SubidorArchivo.module.css';

export interface ArchivoAdjunto {
    url: string;
    nombre: string;
}

interface SubidorArchivoProps {
    archivo: ArchivoAdjunto | null;
    onCambio: (archivo: ArchivoAdjunto | null) => void;
    textoAyuda?: string;
    altoVistaPrevia?: string;
}

export default function SubidorArchivo({
    archivo,
    onCambio,
    textoAyuda = `Imágenes o PDF, hasta ${TAMANIO_MAXIMO_MB} MB.`,
    altoVistaPrevia = '420px',
}: SubidorArchivoProps) {
    const [error, setError] = useState<string | null>(null);
    const [leyendo, setLeyendo] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const limpiarInput = () => {
        if (inputRef.current) inputRef.current.value = '';
    };

    const manejarSeleccion = (evento: React.ChangeEvent<HTMLInputElement>) => {
        const seleccionado = evento.target.files?.[0];
        setError(null);

        if (!seleccionado) return;

        if (!esTipoAceptado(seleccionado)) {
            setError('Seleccione una imagen o un archivo PDF.');
            limpiarInput();
            onCambio(null);
            return;
        }

        if (seleccionado.size > TAMANIO_MAXIMO_BYTES) {
            const pesa = (seleccionado.size / 1024 / 1024).toFixed(1);
            setError(`El archivo pesa ${pesa} MB y el máximo permitido es ${TAMANIO_MAXIMO_MB} MB.`);
            limpiarInput();
            onCambio(null);
            return;
        }

        setLeyendo(true);
        const lector = new FileReader();
        lector.onload = () => {
            setLeyendo(false);
            if (typeof lector.result === 'string') {
                onCambio({ url: lector.result, nombre: seleccionado.name });
            } else {
                setError('No se pudo leer el archivo seleccionado. Intente nuevamente.');
                limpiarInput();
            }
        };
        lector.onerror = () => {
            setLeyendo(false);
            setError('No se pudo leer el archivo seleccionado. Intente nuevamente.');
            limpiarInput();
        };
        lector.readAsDataURL(seleccionado);
    };

    const quitar = () => {
        setError(null);
        limpiarInput();
        onCambio(null);
    };

    return (
        <div className={styles.contenedor}>
            <input
                ref={inputRef}
                type="file"
                className={styles.campo}
                accept={TIPOS_ACEPTADOS}
                onChange={manejarSeleccion}
            />

            {leyendo && <span className={styles.ayuda}>Leyendo el archivo...</span>}
            {error ? <span className={styles.error}>{error}</span> : <span className={styles.ayuda}>{textoAyuda}</span>}

            {archivo && (
                <VisorArchivo
                    url={archivo.url}
                    nombre={archivo.nombre}
                    alto={altoVistaPrevia}
                    acciones={
                        <button
                            type="button"
                            className={styles.quitar}
                            onClick={quitar}
                            title="Quitar archivo"
                            aria-label="Quitar archivo"
                        >
                            <i className="bi bi-trash"></i>
                            Quitar
                        </button>
                    }
                />
            )}
        </div>
    );
}
