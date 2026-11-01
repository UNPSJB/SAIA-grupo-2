import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { Incidente } from '../../types/incidentes';
import {
    adjuntarFoto,
    cerrarIncidente,
    getIncidenteById,
    reabrirIncidente,
} from '../../services/incidentesServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import VisorArchivo from '../../components/VisorArchivo';
import SubidorArchivo from '../../components/SubidorArchivo';
import type { ArchivoAdjunto } from '../../components/SubidorArchivo';
import ModalAlerta from '../../components/alerta';
import {
    COLOR_ESTADO,
    COLOR_MOVIMIENTO,
    DIAS_PARA_DESTACAR_ANTIGUEDAD,
    ETIQUETA_ESTADO,
    ETIQUETA_MOVIMIENTO,
    ICONO_MOVIMIENTO,
    ETIQUETA_TIPO,
    formatearFechaHora,
    nombreCompleto,
    textoAntiguedad,
} from './estadoIncidente';
import styles from '../../styles/shared.module.css';

export default function IncidenteDetail() {
    const { id } = useParams();
    const { usuario } = useAuth();
    const [incidente, setIncidente] = useState<Incidente | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [fotoNueva, setFotoNueva] = useState<ArchivoAdjunto | null>(null);
    const [subiendo, setSubiendo] = useState(false);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    const [accionCorrectiva, setAccionCorrectiva] = useState('');
    const [motivoReapertura, setMotivoReapertura] = useState('');
    const [mostrarReapertura, setMostrarReapertura] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [errorTexto, setErrorTexto] = useState<string | null>(null);

    const cargarIncidente = async () => {
        if (!id) return;
        try {
            setError(null);
            setIncidente(await getIncidenteById(id));
        } catch (problema) {
            console.error('Error al cargar el incidente:', problema);
            setError('No se pudo cargar el incidente.');
        }
    };

    useEffect(() => {
        cargarIncidente();
    }, [id]);

    const guardarFoto = async () => {
        if (!id || !fotoNueva) return;
        try {
            setSubiendo(true);
            const exito = await adjuntarFoto(id, {
                archivo_url: fotoNueva.url,
                archivo_nombre: fotoNueva.nombre,
            });
            if (exito) {
                setFotoNueva(null);
                await cargarIncidente();
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
            setSubiendo(false);
        }
    };

    const registrarAccionCorrectiva = async () => {
        if (!id || !usuario?.id) return;
        if (accionCorrectiva.trim().length < 3) {
            setErrorTexto('Describí qué se hizo para resolver el incidente');
            return;
        }
        try {
            setProcesando(true);
            setErrorTexto(null);
            const exito = await cerrarIncidente(id, {
                accion_correctiva: accionCorrectiva.trim(),
                responsable_id: usuario.id,
            });
            if (exito) {
                setAccionCorrectiva('');
                await cargarIncidente();
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'No se pudo cerrar',
                    mensaje: 'Revisá los datos e intentá nuevamente.',
                });
            }
        } catch (problema) {
            console.error('Error al cerrar el incidente:', problema);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error de conexión',
                mensaje: 'No se pudo contactar al servidor.',
            });
        } finally {
            setProcesando(false);
        }
    };

    const confirmarReapertura = async () => {
        if (!id || !usuario?.id) return;
        if (motivoReapertura.trim().length < 3) {
            setErrorTexto('Indicá por qué se reabre el incidente');
            return;
        }
        try {
            setProcesando(true);
            setErrorTexto(null);
            const exito = await reabrirIncidente(id, {
                motivo: motivoReapertura.trim(),
                responsable_id: usuario.id,
            });
            if (exito) {
                setMotivoReapertura('');
                setMostrarReapertura(false);
                await cargarIncidente();
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'No se pudo reabrir',
                    mensaje: 'Revisá los datos e intentá nuevamente.',
                });
            }
        } catch (problema) {
            console.error('Error al reabrir el incidente:', problema);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error de conexión',
                mensaje: 'No se pudo contactar al servidor.',
            });
        } finally {
            setProcesando(false);
        }
    };

    const estiloTextarea: React.CSSProperties = {
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
    };

    if (error) {
        return (
            <div className={styles.contenedorPrincipal}>
                <h2>Detalle del Incidente</h2>
                <p style={{ color: 'var(--rojo-texto)' }}>{error}</p>
                <Link to="/incidentes">
                    <Boton variant="volver">Volver al listado</Boton>
                </Link>
            </div>
        );
    }

    if (!incidente) {
        return (
            <div className={styles.contenedorPrincipal}>
                <h2>Detalle del Incidente</h2>
                <p style={{ color: 'var(--text-muted)' }}>Cargando incidente...</p>
            </div>
        );
    }

    const esViejo =
        incidente.dias_abierto !== null && incidente.dias_abierto >= DIAS_PARA_DESTACAR_ANTIGUEDAD;

    const dato = (etiqueta: string, contenido: React.ReactNode) => (
        <div>
            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {etiqueta}
            </span>
            <span style={{ color: 'var(--text-h)', fontSize: '0.95rem' }}>{contenido}</span>
        </div>
    );

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Incidente</h2>

            <div className={styles.tarjetaEstatica} style={{ width: '100%', maxWidth: '900px', textAlign: 'left' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                        gap: '18px',
                        marginBottom: '20px',
                    }}
                >
                    {dato('Fecha y hora', formatearFechaHora(incidente.fecha_hora_reporte))}
                    {dato('Tipo', ETIQUETA_TIPO[incidente.tipo])}
                    {dato(
                        'Reportado por',
                        `${nombreCompleto(incidente.empleado)} (${incidente.empleado.legajo})`
                    )}
                    {dato(
                        'Estado',
                        <span style={{ color: COLOR_ESTADO[incidente.estado], fontWeight: 'bold' }}>
                            {ETIQUETA_ESTADO[incidente.estado]}
                            {esViejo && ` · abierto hace ${textoAntiguedad(incidente.dias_abierto)}`}
                        </span>
                    )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Descripción
                    </span>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text)', lineHeight: 1.5 }}>
                        {incidente.descripcion}
                    </p>
                </div>

                {incidente.archivo_url ? (
                    <VisorArchivo
                        url={incidente.archivo_url}
                        nombre={incidente.archivo_nombre}
                        alto="58vh"
                    />
                ) : (
                    <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
                            Este incidente se registró sin foto. Podés adjuntarla ahora.
                        </span>
                        <SubidorArchivo
                            archivo={fotoNueva}
                            onCambio={setFotoNueva}
                            textoAyuda="Imágenes o PDF, hasta 25 MB. Una vez adjuntada no se puede reemplazar."
                            altoVistaPrevia="48vh"
                        />
                        {fotoNueva && (
                            <div className={styles.filaBotones} style={{ marginTop: '14px', justifyContent: 'flex-start' }}>
                                <Boton variant="guardar" onClick={guardarFoto} disabled={subiendo}>
                                    {subiendo ? 'Adjuntando...' : 'Adjuntar Foto'}
                                </Boton>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                    {incidente.estado === 'cerrado' ? (
                        <>
                            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Acción correctiva
                            </span>
                            <p style={{ margin: '4px 0 10px 0', color: 'var(--text)', lineHeight: 1.5 }}>
                                {incidente.accion_correctiva}
                            </p>
                            {incidente.fecha_cierre && (
                                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>
                                    Cerrado el {formatearFechaHora(incidente.fecha_cierre)}
                                    {incidente.responsable_cierre
                                        ? ` por ${nombreCompleto(incidente.responsable_cierre)}`
                                        : ''}
                                </span>
                            )}

                            {mostrarReapertura ? (
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px' }}>
                                        ¿Por qué se reabre?
                                    </label>
                                    <textarea
                                        value={motivoReapertura}
                                        onChange={(evento) => {
                                            setMotivoReapertura(evento.target.value);
                                            if (errorTexto) setErrorTexto(null);
                                        }}
                                        rows={3}
                                        maxLength={1000}
                                        placeholder="Ej: El problema volvió a aparecer a los 10 días"
                                        style={{
                                            ...estiloTextarea,
                                            ...(errorTexto ? { borderColor: 'var(--rojo-texto)' } : {}),
                                        }}
                                    />
                                    {errorTexto && (
                                        <span style={{ color: 'var(--rojo-texto)', fontSize: '0.8rem' }}>{errorTexto}</span>
                                    )}
                                    <div className={styles.filaBotones} style={{ marginTop: '12px', justifyContent: 'flex-start' }}>
                                        <Boton variant="guardar" onClick={confirmarReapertura} disabled={procesando}>
                                            {procesando ? 'Reabriendo...' : 'Confirmar Reapertura'}
                                        </Boton>
                                        <Boton
                                            variant="eliminar"
                                            onClick={() => {
                                                setMostrarReapertura(false);
                                                setMotivoReapertura('');
                                                setErrorTexto(null);
                                            }}
                                        >
                                            Cancelar
                                        </Boton>
                                    </div>
                                </div>
                            ) : (
                                <Boton variant="editar" onClick={() => setMostrarReapertura(true)}>
                                    Reabrir Incidente
                                </Boton>
                            )}
                        </>
                    ) : (
                        <>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px' }}>
                                Acción correctiva {incidente.movimientos.length > 0 ? '(el incidente fue reabierto)' : ''}
                            </label>
                            <textarea
                                value={accionCorrectiva}
                                onChange={(evento) => {
                                    setAccionCorrectiva(evento.target.value);
                                    if (errorTexto) setErrorTexto(null);
                                }}
                                rows={3}
                                maxLength={1000}
                                placeholder="Ej: Se reemplazó la válvula y se verificó la temperatura durante 24 h"
                                style={{
                                    ...estiloTextarea,
                                    ...(errorTexto ? { borderColor: 'var(--rojo-texto)' } : {}),
                                }}
                            />
                            {errorTexto ? (
                                <span style={{ color: 'var(--rojo-texto)', fontSize: '0.8rem' }}>{errorTexto}</span>
                            ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                    Al registrarla, el incidente queda cerrado a tu nombre.
                                </span>
                            )}
                            <div className={styles.filaBotones} style={{ marginTop: '12px', justifyContent: 'flex-start' }}>
                                <Boton variant="guardar" onClick={registrarAccionCorrectiva} disabled={procesando}>
                                    {procesando ? 'Guardando...' : 'Registrar y Cerrar'}
                                </Boton>
                            </div>
                        </>
                    )}
                </div>

                {incidente.movimientos.length > 0 && (
                    <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                            Historial ({incidente.movimientos.length}{' '}
                            {incidente.movimientos.length === 1 ? 'movimiento' : 'movimientos'})
                        </span>

                        {incidente.movimientos
                            .slice()
                            .reverse()
                            .map((movimiento) => (
                                <div
                                    key={movimiento.id}
                                    style={{
                                        display: 'flex',
                                        gap: '12px',
                                        padding: '10px 0',
                                        borderBottom: '1px solid var(--border)',
                                    }}
                                >
                                    <i
                                        className={`bi ${ICONO_MOVIMIENTO[movimiento.tipo]}`}
                                        style={{ color: COLOR_MOVIMIENTO[movimiento.tipo], fontSize: '1rem', marginTop: '2px' }}
                                    ></i>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <span
                                            style={{
                                                color: COLOR_MOVIMIENTO[movimiento.tipo],
                                                fontWeight: 'bold',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            {ETIQUETA_MOVIMIENTO[movimiento.tipo]}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                            {' · '}
                                            {formatearFechaHora(movimiento.fecha_hora)} por{' '}
                                            {nombreCompleto(movimiento.empleado)}
                                        </span>
                                        <p style={{ margin: '3px 0 0 0', color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.45 }}>
                                            {movimiento.descripcion}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                <Link to="/incidentes">
                    <Boton variant="volver">Volver al listado</Boton>
                </Link>
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
