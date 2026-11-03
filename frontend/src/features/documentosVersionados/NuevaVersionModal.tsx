import { useState, type FormEvent } from 'react';
import { subirNuevaVersionDocumento } from '../../services/documentosVersionadosServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import SubidorArchivo, { type ArchivoAdjunto } from '../../components/SubidorArchivo';
import sharedStyles from '../../styles/shared.module.css';

interface NuevaVersionModalProps {
    documentoId: number;
    documentoNombre?: string;
    onClose: () => void;
    onVersionCreada?: () => void;
}

export default function NuevaVersionModal({
    documentoId,
    documentoNombre,
    onClose,
    onVersionCreada,
}: NuevaVersionModalProps) {
    const { usuario } = useAuth();
    const [archivo, setArchivo] = useState<ArchivoAdjunto | null>(null);
    const [nombreArchivo, setNombreArchivo] = useState('');
    const [fechaVigencia, setFechaVigencia] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (usuario?.rol !== 'admin') return null;

    const handleCambioArchivo = (nuevoArchivo: ArchivoAdjunto | null) => {
        setArchivo(nuevoArchivo);
        setNombreArchivo(nuevoArchivo?.nombre ?? '');
        if (nuevoArchivo) setError(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!archivo) {
            setError('Seleccioná el archivo de la nueva versión.');
            return;
        }
        if (!nombreArchivo.trim()) {
            setError('Ingresá un nombre para el archivo.');
            return;
        }

        setError(null);
        setGuardando(true);

        try {
            await subirNuevaVersionDocumento({
                documentos_versionados_id: documentoId,
                version_documento_url: archivo.url,
                archivo_nombre: nombreArchivo.trim(),
                subido_por_id: usuario.id,
                ...(fechaVigencia ? { fecha_vigencia: fechaVigencia } : {}),
            });
            onVersionCreada?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al subir la nueva versión.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div
            className={sharedStyles.modalOverlay}
            onClick={() => {
                if (!guardando) onClose();
            }}
        >
            <div
                className={sharedStyles.modalFormulario}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-nueva-version"
            >
                <h2 id="titulo-nueva-version" className={sharedStyles.modalTitulo}>
                    Subir nueva versión
                </h2>
                <p className={sharedStyles.textMuted} style={{ marginTop: '-5px', marginBottom: '20px' }}>
                    Documento: <strong>{documentoNombre || `#${documentoId}`}</strong>
                </p>

                {error && (
                    <div className={sharedStyles.textDanger} role="alert" style={{ marginBottom: '16px' }}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label className={sharedStyles.modalTituloCampo}>
                            Archivo de la nueva versión <span aria-hidden="true">*</span>
                        </label>
                        <SubidorArchivo
                            archivo={archivo}
                            onCambio={handleCambioArchivo}
                            textoAyuda="Seleccioná la nueva versión en formato PDF o imagen, hasta 25 MB."
                            altoVistaPrevia="52vh"
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="nombre-nueva-version" className={sharedStyles.modalTituloCampo}>
                            Nombre del archivo <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="nombre-nueva-version"
                            type="text"
                            className={sharedStyles.modalIngresoTexto}
                            value={nombreArchivo}
                            onChange={(event) => setNombreArchivo(event.target.value)}
                            disabled={guardando}
                            required
                            maxLength={255}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="fecha-vigencia-nueva-version" className={sharedStyles.modalTituloCampo}>
                            Fecha de vigencia
                        </label>
                        <input
                            id="fecha-vigencia-nueva-version"
                            type="date"
                            className={`${sharedStyles.filtroFecha} ${sharedStyles.filtroFechaCompacto}`}
                            value={fechaVigencia}
                            className={sharedStyles.filtroFecha}
                            onChange={(event) => setFechaVigencia(event.target.value)}
                            disabled={guardando}
                        />
                    </div>

                    <div className={sharedStyles.filaBotones}>
                        <Boton variant="guardar" type="submit" disabled={guardando}>
                            {guardando ? 'Subiendo...' : 'Subir versión'}
                        </Boton>
                        <Boton variant="volver" onClick={onClose} disabled={guardando}>
                            Cancelar
                        </Boton>
                    </div>
                </form>
            </div>
        </div>
    );
}
