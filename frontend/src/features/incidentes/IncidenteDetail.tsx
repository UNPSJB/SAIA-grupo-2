import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { Incidente } from '../../types/incidentes';
import { adjuntarFoto, getIncidenteById } from '../../services/incidentesServices';
import Boton from '../../components/Boton';
import VisorArchivo from '../../components/VisorArchivo';
import SubidorArchivo from '../../components/SubidorArchivo';
import type { ArchivoAdjunto } from '../../components/SubidorArchivo';
import ModalAlerta from '../../components/alerta';
import {
    COLOR_ESTADO,
    DIAS_PARA_DESTACAR_ANTIGUEDAD,
    ETIQUETA_ESTADO,
    ETIQUETA_TIPO,
    formatearFechaHora,
    nombreCompleto,
    textoAntiguedad,
} from './estadoIncidente';
import styles from '../../styles/shared.module.css';

export default function IncidenteDetail() {
    const { id } = useParams();
    const [incidente, setIncidente] = useState<Incidente | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [fotoNueva, setFotoNueva] = useState<ArchivoAdjunto | null>(null);
    const [subiendo, setSubiendo] = useState(false);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

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

                {incidente.accion_correctiva && (
                    <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Acción correctiva
                        </span>
                        <p style={{ margin: '4px 0 10px 0', color: 'var(--text)', lineHeight: 1.5 }}>
                            {incidente.accion_correctiva}
                        </p>
                        {incidente.fecha_cierre && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                Cerrado el {formatearFechaHora(incidente.fecha_cierre)}
                                {incidente.responsable_cierre
                                    ? ` por ${nombreCompleto(incidente.responsable_cierre)}`
                                    : ''}
                            </span>
                        )}
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
