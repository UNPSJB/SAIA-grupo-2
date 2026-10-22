import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { Incidente, IncidentePayload, TipoIncidente } from '../../types/incidentes';
import { adjuntarFoto, createIncidente } from '../../services/incidentesServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import SubidorArchivo from '../../components/SubidorArchivo';
import type { ArchivoAdjunto } from '../../components/SubidorArchivo';
import ModalAlerta from '../../components/alerta';
import { ETIQUETA_TIPO, TIPOS_INCIDENTE, formatearFechaHora } from './estadoIncidente';
import styles from '../../styles/shared.module.css';

interface Errores {
    descripcion?: string;
}

export default function IncidenteForm() {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';

    const [descripcion, setDescripcion] = useState('');
    const [tipo, setTipo] = useState<TipoIncidente>('otro');
    const [archivo, setArchivo] = useState<ArchivoAdjunto | null>(null);

    const [errores, setErrores] = useState<Errores>({});
    const [guardando, setGuardando] = useState(false);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    const [registrado, setRegistrado] = useState<Incidente | null>(null);
    const [fotoTardia, setFotoTardia] = useState<ArchivoAdjunto | null>(null);
    const [adjuntando, setAdjuntando] = useState(false);

    const validar = (): Errores => {
        const nuevos: Errores = {};
        if (descripcion.trim().length < 3) {
            nuevos.descripcion = 'Describí brevemente qué pasó';
        }
        return nuevos;
    };

    const handleSubmit = async (evento: React.FormEvent) => {
        evento.preventDefault();

        const nuevosErrores = validar();
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) return;

        if (!usuario?.id) {
            setModalAlerta({
                isOpen: true,
                titulo: 'No se pudo registrar',
                mensaje: 'No se pudo identificar al usuario que reporta. Volvé a iniciar sesión.',
            });
            return;
        }

        const datos: IncidentePayload = {
            descripcion: descripcion.trim(),
            empleado_id: usuario.id,
            tipo,
            archivo_url: archivo ? archivo.url : null,
            archivo_nombre: archivo ? archivo.nombre : null,
        };

        try {
            setGuardando(true);
            const creado = await createIncidente(datos);
            if (creado) {
                setRegistrado(creado);
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'No se pudo registrar',
                    mensaje: 'Revisá los datos e intentá nuevamente.',
                });
            }
        } catch (problema) {
            console.error('Error al registrar el incidente:', problema);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error de conexión',
                mensaje: 'No se pudo contactar al servidor.',
            });
        } finally {
            setGuardando(false);
        }
    };

    const guardarFotoTardia = async () => {
        if (!registrado || !fotoTardia) return;
        try {
            setAdjuntando(true);
            const exito = await adjuntarFoto(registrado.id, {
                archivo_url: fotoTardia.url,
                archivo_nombre: fotoTardia.nombre,
            });
            if (exito) {
                setRegistrado({ ...registrado, archivo_url: fotoTardia.url, archivo_nombre: fotoTardia.nombre });
                setFotoTardia(null);
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'No se pudo adjuntar',
                    mensaje: 'El incidente ya tiene una foto o el archivo no es válido.',
                });
            }
        } catch (problema) {
            console.error('Error al adjuntar la foto:', problema);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error de conexión',
                mensaje: 'No se pudo contactar al servidor.',
            });
        } finally {
            setAdjuntando(false);
        }
    };

    const registrarOtro = () => {
        setRegistrado(null);
        setFotoTardia(null);
        setDescripcion('');
        setTipo('otro');
        setArchivo(null);
        setErrores({});
    };

    const estiloError = { borderColor: 'var(--rojo-texto)', outline: 'none' };
    const estiloMensaje = { color: 'var(--rojo-texto)', fontSize: '0.8rem', marginTop: '5px' };

    if (registrado) {
        return (
            <div className={styles.contenedorPrincipal}>
                <h2>Incidente Registrado</h2>
                <p style={{ marginTop: '-10px', marginBottom: '20px', color: 'var(--verde-texto)', fontWeight: 'bold' }}>
                    Quedó asentado el {formatearFechaHora(registrado.fecha_hora_reporte)}.
                </p>

                <div className={styles.tarjetaEstatica} style={{ width: '100%', maxWidth: '780px', textAlign: 'left' }}>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {ETIQUETA_TIPO[registrado.tipo]}
                    </span>
                    <p style={{ margin: '4px 0 18px 0', color: 'var(--text)', lineHeight: 1.5 }}>
                        {registrado.descripcion}
                    </p>

                    {registrado.archivo_url ? (
                        <p style={{ margin: 0, color: 'var(--verde-texto)', fontSize: '0.9rem' }}>
                            <i className="bi bi-camera"></i> Foto adjunta: {registrado.archivo_nombre}
                        </p>
                    ) : (
                        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                Lo registraste sin foto. Si la tenés a mano, podés adjuntarla ahora.
                            </span>
                            <SubidorArchivo
                                archivo={fotoTardia}
                                onCambio={setFotoTardia}
                                textoAyuda="Imágenes o PDF, hasta 25 MB. Una vez adjuntada no se puede reemplazar."
                                altoVistaPrevia="48vh"
                            />
                            {fotoTardia && (
                                <div className={styles.filaBotones} style={{ marginTop: '14px', justifyContent: 'flex-start' }}>
                                    <Boton variant="guardar" onClick={guardarFotoTardia} disabled={adjuntando}>
                                        {adjuntando ? 'Adjuntando...' : 'Adjuntar Foto'}
                                    </Boton>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton variant="crear" onClick={registrarOtro}>
                        Registrar Otro
                    </Boton>
                    {esAdmin && (
                        <Boton variant="siguiente" onClick={() => navigate('/incidentes')}>
                            Ver Listado
                        </Boton>
                    )}
                </div>

                <ModalAlerta
                    isOpen={modalAlerta.isOpen}
                    titulo={modalAlerta.titulo}
                    mensaje={modalAlerta.mensaje}
                    onClose={() => setModalAlerta({ isOpen: false, titulo: '', mensaje: '' })}
                />
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Registrar Incidente</h2>
            <p style={{ marginTop: '-10px', marginBottom: '20px', color: 'var(--text-muted)' }}>
                Se guarda automáticamente la fecha, la hora y tu usuario. Si no tenés la foto a mano,
                podés adjuntarla después desde el detalle.
            </p>

            <form onSubmit={handleSubmit} className={styles.formularioTarjeta} style={{ maxWidth: '780px' }}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>¿Qué pasó?</label>
                        <textarea
                            value={descripcion}
                            onChange={(evento) => {
                                setDescripcion(evento.target.value);
                                if (errores.descripcion) setErrores({});
                            }}
                            rows={4}
                            maxLength={1000}
                            placeholder="Ej: Se rompió el burlete de la puerta de la cámara 2"
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--text)',
                                fontFamily: 'inherit',
                                fontSize: '0.95rem',
                                resize: 'vertical',
                                ...(errores.descripcion ? estiloError : {}),
                            }}
                        />
                        {errores.descripcion && <span style={estiloMensaje}>{errores.descripcion}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Tipo de incidente:</label>
                        <select value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoIncidente)}>
                            {TIPOS_INCIDENTE.map((valor) => (
                                <option key={valor} value={valor}>
                                    {ETIQUETA_TIPO[valor]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Reportado por:</label>
                        <input
                            type="text"
                            value={usuario ? `${usuario.legajo} — ${usuario.nombre} ${usuario.apellido}` : ''}
                            disabled
                            style={{ backgroundColor: 'var(--blocked-input-bg)', color: 'var(--text-muted)' }}
                        />
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Foto (opcional):</label>
                        <SubidorArchivo
                            archivo={archivo}
                            onCambio={setArchivo}
                            textoAyuda="Sacá o adjuntá una foto del incidente. Imágenes o PDF, hasta 25 MB."
                            altoVistaPrevia="52vh"
                        />
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar" disabled={guardando}>
                        {guardando ? 'Registrando...' : 'Registrar Incidente'}
                    </Boton>
                    {esAdmin && (
                        <Link to="/incidentes">
                            <Boton variant="volver">Cancelar</Boton>
                        </Link>
                    )}
                </div>
            </form>

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ isOpen: false, titulo: '', mensaje: '' })}
            />
        </div>
    );
}
