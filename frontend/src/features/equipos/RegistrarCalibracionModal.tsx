import { useState, type FormEvent } from 'react';
import type { CalibracionRealizadaPayload } from '../../types/calibracionRealizada';
import type { Equipo } from '../../types/equipos';
import { registrarCalibracion } from '../../services/calibracionRealizadaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';
import SubidorArchivo, { type ArchivoAdjunto } from '../../components/SubidorArchivo';

interface RegistrarCalibracionModalProps {
    equipo: Equipo;
    onClose: () => void;
    onSuccess: () => void;
}

const obtenerFechaLocal = () => {
    const fecha = new Date();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
};

export default function RegistrarCalibracionModal({
    equipo,
    onClose,
    onSuccess,
}: RegistrarCalibracionModalProps) {
    const [archivo, setArchivo] = useState<ArchivoAdjunto | null>(null);
    const [fecha, setFecha] = useState(obtenerFechaLocal());
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCambioArchivo = (nuevoArchivo: ArchivoAdjunto | null) => {
        setArchivo(nuevoArchivo);
        if (nuevoArchivo) setError(null);
    };

    const fechaMaxima = obtenerFechaLocal();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!archivo) {
            setError('Seleccioná el archivo de certificación.');
            return;
        }

        setError(null);
        setGuardando(true);
        const payload: CalibracionRealizadaPayload = {
            equipo_id: equipo.id,
            fecha,
            certificacion_url: archivo.url,
        };

        try {
            const resultado = await registrarCalibracion(payload);
            if (!resultado.ok) {
                setError(resultado.mensaje || 'No se pudo registrar la calibración.');
                return;
            }
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar la calibración.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <>
        <div className={styles.modalOverlay}>
            <div className={styles.modalFormulario} style={{ maxWidth: '900px' }}>
                <h2 className={styles.modalTitulo}>Registrar Calibración</h2>

                {error && (
                    <div className={styles.textDanger} role="alert" style={{ marginBottom: '16px' }}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} >
                        <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                            <label className={styles.modalTituloCampo}>Equipo a calibrar:</label>
                            <select
                                value={equipo.id}
                                disabled
                                aria-label="Equipo a calibrar"
                                className={`${styles.modalSelector} ${styles.modalSelectorBloqueado}`}
                            >
                                <option value={equipo.id}>{equipo.nombre}</option>
                            </select>
                        </div>

                        <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                            <label className={styles.modalTituloCampo}>
                                Certificación <span aria-hidden="true">*</span>
                            </label>
                            <SubidorArchivo
                                archivo={archivo}
                                onCambio={handleCambioArchivo}
                                textoAyuda="Seleccioná la certificación en formato PDF o imagen, hasta 25 MB."
                                altoVistaPrevia="52vh"
                            />
                        </div>
                        <div className={styles.formGroup} style={{ marginBottom: '25px' }}>
                            <label className={styles.modalTituloCampo}>Fecha de calibración:</label>
                            <input
                                type="date"
                                value={fecha}
                                onChange={(event) => setFecha(event.target.value)}
                                required
                                max={fechaMaxima}
                                disabled={guardando}
                                className={`${styles.filtroFecha} ${styles.filtroFechaCompacto}`}
                            />
                        </div>
                        
                        <hr style={{ margin: '25px 0', borderColor: 'var(--border)' }} />
                        <div className={styles.filaBotones} style={{ marginTop: '20px', justifyContent: 'flex-end', gap: '12px' }}>
                            <Boton type="submit" variant="guardar" disabled={guardando}>
                                {guardando ? 'Registrando...' : 'Registrar calibración'}
                            </Boton>
                            <Boton type="button" variant="volver" onClick={onClose} disabled={guardando}>
                                Cancelar
                            </Boton>
                        </div>
                </form>
            </div>
        </div>
        </>
    );
}