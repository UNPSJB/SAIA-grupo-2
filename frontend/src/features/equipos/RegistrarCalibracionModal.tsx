import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CalibracionRealizadaPayload } from '../../types/calibracionRealizada';
import type { Equipo } from '../../types/equipos';
import { registrarCalibracion } from '../../services/calibracionRealizadaServices';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

interface FormValues {
    fecha: string;
    certificacion_url: FileList;
}

interface RegistrarCalibracionModalProps {
    equipo: Equipo;
    onClose: () => void;
    onSuccess: () => void;
}

const TAMANIO_MAXIMO_MB = 25;
const TAMANIO_MAXIMO_BYTES = TAMANIO_MAXIMO_MB * 1024 * 1024;

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
    const [vistaPreviaCertificacion, setVistaPreviaCertificacion] = useState<string | null>(null);
    const [leyendoCertificacion, setLeyendoCertificacion] = useState(false);
    const [modalAlerta, setModalAlerta] = useState({
        isOpen: false,
        titulo: '',
        mensaje: '',
    });
    const inputCertificacionRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        reset,
        resetField,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        defaultValues: { fecha: obtenerFechaLocal() }
    });

    const fechaMaxima = obtenerFechaLocal();
    const campoCertificacion = register('certificacion_url', {
        required: 'La certificación es obligatoria',
        validate: (archivos) => {
            const archivo = archivos?.[0];
            if (!archivo) return true;
            if (!archivo.type.startsWith('image/') && archivo.type !== 'application/pdf') {
                return 'Seleccione una imagen o un archivo PDF.';
            }
            if (archivo.size > TAMANIO_MAXIMO_BYTES) {
                return `El archivo no puede superar los ${TAMANIO_MAXIMO_MB} MB.`;
            }
            return true;
        },
        onChange: handleFileChange
    });

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const input = event.currentTarget;
        const archivo = input.files?.[0];
        if (!archivo) {
            setVistaPreviaCertificacion(null);
            return;
        }

        if (!archivo.type.startsWith('image/') && archivo.type !== 'application/pdf') {
            input.value = '';
            resetField('certificacion_url');
            setVistaPreviaCertificacion(null);
            setModalAlerta({
                isOpen: true,
                titulo: 'Archivo no válido',
                mensaje: 'Seleccione una imagen o un archivo PDF.'
            });
            return;
        }

        if (archivo.size > TAMANIO_MAXIMO_BYTES) {
            input.value = '';
            resetField('certificacion_url');
            setVistaPreviaCertificacion(null);
            setModalAlerta({
                isOpen: true,
                titulo: 'Archivo demasiado grande',
                mensaje: `El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo permitido es ${TAMANIO_MAXIMO_MB} MB.`
            });
            return;
        }

        setLeyendoCertificacion(true);
        const lector = new FileReader();
        lector.onload = () => {
            if (typeof lector.result === 'string') {
                setVistaPreviaCertificacion(lector.result);
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'Error al leer el archivo',
                    mensaje: 'No se pudo abrir el archivo seleccionado. Intente nuevamente.'
                });
            }
            setLeyendoCertificacion(false);
        };
        lector.onerror = () => {
            input.value = '';
            resetField('certificacion_url');
            setVistaPreviaCertificacion(null);
            setLeyendoCertificacion(false);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error al leer el archivo',
                mensaje: 'No se pudo abrir el archivo seleccionado. Intente nuevamente.'
            });
        };
        lector.readAsDataURL(archivo);
    }

    const quitarCertificacion = () => {
        setVistaPreviaCertificacion(null);
        resetField('certificacion_url');
        if (inputCertificacionRef.current) inputCertificacionRef.current.value = '';
    };

    const onSubmit = async (data: FormValues) => {
        const archivo = data.certificacion_url?.[0];
        if (!archivo || !vistaPreviaCertificacion) {
            setModalAlerta({
                isOpen: true,
                titulo: 'Certificación requerida',
                mensaje: 'Seleccione una imagen o un archivo PDF como certificación.'
            });
            return;
        }

        const payload: CalibracionRealizadaPayload = {
            equipo_id: equipo.id,
            fecha: data.fecha,
            certificacion_url: vistaPreviaCertificacion
        };

        try {
            const resultado = await registrarCalibracion(payload);
            if (!resultado.ok) {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'Error al guardar',
                    mensaje: resultado.mensaje || 'No se pudo registrar la calibración.'
                });
                return;
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error al registrar la calibración:', error);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error de conexión',
                mensaje: 'No se pudo conectar con el servidor para registrar la calibración.'
            });
        }
    };

    const cerrarModal = () => {
        reset({ fecha: obtenerFechaLocal() });
        setVistaPreviaCertificacion(null);
        onClose();
    };

    return (
        <>
        <div className={styles.modalOverlay}>
            <div style={{ backgroundColor: 'var(--bg)', width: '95%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>Registrar Calibración</h2>

                <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} style={{ boxShadow: 'none', padding: 0, border: 'none' }}>
                        <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Equipo a calibrar:</label>
                            <select
                                value={equipo.id}
                                disabled
                                aria-label="Equipo a calibrar"
                                style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#e5e7eb', color: '#4b5563' }}
                            >
                                <option value={equipo.id}>{equipo.nombre}</option>
                            </select>
                        </div>

                        <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Certificación (Obligatoria):</label>
                            <input 
                                type="file" 
                                accept="image/*,application/pdf,.pdf" 
                                {...campoCertificacion}
                                ref={(element) => {
                                    campoCertificacion.ref(element);
                                    inputCertificacionRef.current = element;
                                }}
                                style={{ width: '100%', padding: '10px', fontSize: '1rem', borderRadius: '8px', border: '1px dashed var(--border)', backgroundColor: '#f9fafb', color: '#1f2937' }} 
                            />
                            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>Permite la subida de imágenes y documentos PDF (máximo {TAMANIO_MAXIMO_MB} MB)</small>
                            {leyendoCertificacion && (
                                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>
                                    Cargando vista previa...
                                </small>
                            )}
                            {errors.certificacion_url && (
                                <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>
                                    {errors.certificacion_url.message}
                                </span>
                            )}

                            {vistaPreviaCertificacion && (
                                <div style={{ position: 'relative', marginTop: '12px', textAlign: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-h)' }}>Vista previa de la certificación:</p>
                                        <button
                                            type="button"
                                            onClick={quitarCertificacion}
                                            title="Quitar foto"
                                            style={{
                                                background: '#fee2e2',
                                                color: '#dc2626',
                                                border: '1px solid #fca5a5',
                                                borderRadius: '50%',
                                                width: '26px',
                                                height: '26px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '1rem',
                                                lineHeight: 1,
                                                padding: 0
                                            }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    {vistaPreviaCertificacion.startsWith('data:image/') ? (
                                        <img
                                            src={vistaPreviaCertificacion}
                                            alt="Vista previa de la certificación"
                                            style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '6px', objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <iframe
                                            src={vistaPreviaCertificacion}
                                            title="Vista previa de la certificación PDF"
                                            style={{ width: '100%', height: '320px', border: 0 }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                        <div className={styles.formGroup} style={{ marginBottom: '25px' }}>
                            <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Fecha de calibración:</label>
                            <input
                                type="date"
                                max={fechaMaxima}
                                {...register('fecha', {
                                    required: 'La fecha es obligatoria',
                                    max: { value: fechaMaxima, message: 'La fecha no puede ser futura' }
                                })}
                                style={errors.fecha ? { borderColor: '#ef4444' } : {}}
                            />
                            {errors.fecha && (
                                <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>
                                    {errors.fecha.message}
                                </span>
                            )}
                        </div>
                        
                        <hr style={{ margin: '30px 0', borderColor: 'var(--border)' }} />
                        <div className={styles.filaBotones} style={{ marginTop: '30px', justifyContent: 'flex-end', gap: '15px' }}>
                            <Boton type="button" variant="volver" onClick={cerrarModal}>Cancelar</Boton>
                            <Boton type="submit" variant="guardar" disabled={isSubmitting || leyendoCertificacion}>
                                {isSubmitting ? 'Guardando...' : leyendoCertificacion ? 'Leyendo archivo...' : 'Registrar calibración'}
                            </Boton>
                        </div>
                </form>
            </div>
        </div>
        <ModalAlerta
            isOpen={modalAlerta.isOpen}
            titulo={modalAlerta.titulo}
            mensaje={modalAlerta.mensaje}
            onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
        />
        </>
    );
}