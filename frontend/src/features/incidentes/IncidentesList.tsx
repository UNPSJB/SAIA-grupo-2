import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { EstadoIncidente, Incidente, ResumenIncidentes } from '../../types/incidentes';
import {
    getIncidentes,
    getIncidentesAbiertos,
    getResumenIncidentes,
} from '../../services/incidentesServices';
import Boton from '../../components/Boton';
import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';
import { abrirArchivoEnPestania } from '../../utils/archivos';
import {
    COLOR_ESTADO,
    DIAS_PARA_DESTACAR_ANTIGUEDAD,
    ESTADOS_INCIDENTE,
    ETIQUETA_ESTADO,
    ETIQUETA_TIPO,
    formatearFechaHora,
    nombreCompleto,
    textoAntiguedad,
} from './estadoIncidente';
import styles from '../../styles/shared.module.css';

const GRILLA = '1.05fr 2.5fr 1.05fr 1.25fr 0.85fr 0.85fr 0.6fr 0.75fr';

const CELDA_SIN_CORTE: React.CSSProperties = {
    fontSize: '0.86rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

interface IncidentesListProps {
    /** Pantalla de incidentes abiertos: filtra sola y ordena del mas viejo al mas nuevo. */
    soloAbiertos?: boolean;
}

export default function IncidentesList({ soloAbiertos = false }: IncidentesListProps) {
    const [incidentes, setIncidentes] = useState<Incidente[]>([]);
    const [resumen, setResumen] = useState<ResumenIncidentes | null>(null);
    const [filtroEstado, setFiltroEstado] = useState<EstadoIncidente | ''>('');
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                setCargando(true);
                setError(null);

                if (soloAbiertos) {
                    const [datos, conteos] = await Promise.all([
                        getIncidentesAbiertos(),
                        getResumenIncidentes(),
                    ]);
                    setIncidentes(datos);
                    setResumen(conteos);
                } else {
                    setIncidentes(await getIncidentes(filtroEstado === '' ? undefined : filtroEstado));
                }
            } catch (problema) {
                console.error('Error al cargar los incidentes:', problema);
                setError('No se pudo cargar el listado de incidentes.');
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
    }, [filtroEstado, soloAbiertos]);

    const incidentesFiltrados = filtrarPorTexto(incidentes, busqueda, (item) => [
        ETIQUETA_TIPO[item.tipo],
        ETIQUETA_ESTADO[item.estado],
        nombreCompleto(item.empleado),
    ]);

    const abiertos = incidentes.filter((item) => item.estado === 'abierto').length;

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{soloAbiertos ? 'Incidentes Abiertos' : 'Incidentes Reportados'}</h2>
            <p style={{ marginTop: '-10px', marginBottom: soloAbiertos ? '14px' : '20px', color: 'var(--text-muted)' }}>
                {soloAbiertos
                    ? incidentes.length > 0
                        ? `${incidentes.length} ${incidentes.length === 1 ? 'incidente sigue' : 'incidentes siguen'} sin resolver, del más antiguo al más reciente.`
                        : 'No queda ningún incidente sin resolver.'
                    : abiertos > 0
                      ? `${abiertos} ${abiertos === 1 ? 'incidente abierto' : 'incidentes abiertos'} esperando resolución.`
                      : 'No hay incidentes abiertos.'}
            </p>

            {soloAbiertos && resumen && resumen.abiertos > 0 && (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        width: '100%',
                        maxWidth: '1280px',
                        marginBottom: '18px',
                    }}
                >
                    {resumen.abiertos_por_tipo
                        .filter((conteo) => conteo.cantidad > 0)
                        .map((conteo) => (
                            <span
                                key={conteo.tipo}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '999px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--card-bg)',
                                    color: 'var(--text)',
                                    fontSize: '0.82rem',
                                }}
                            >
                                {ETIQUETA_TIPO[conteo.tipo]}:{' '}
                                <strong style={{ color: 'var(--text-h)' }}>{conteo.cantidad}</strong>
                            </span>
                        ))}
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    maxWidth: '1280px',
                    marginBottom: '16px',
                }}
            >
                <Link to="/incidentes/nuevo">
                    <Boton variant="crear">Registrar Incidente</Boton>
                </Link>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {!soloAbiertos && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Estado:</span>
                            <select
                                value={filtroEstado}
                                onChange={(evento) => setFiltroEstado(evento.target.value as EstadoIncidente | '')}
                                style={{ padding: '8px 10px' }}
                            >
                                <option value="">Todos</option>
                                {ESTADOS_INCIDENTE.map((estado) => (
                                    <option key={estado} value={estado}>
                                        {ETIQUETA_ESTADO[estado]}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <BuscadorTexto
                        valor={busqueda}
                        onCambio={setBusqueda}
                        placeholder="Buscar por descripción o persona..."
                    />
                </div>
            </div>

            {error && <p style={{ color: 'var(--rojo-texto)' }}>{error}</p>}

            <div className={styles.contenedorTabla} style={{ maxWidth: '1280px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: GRILLA }}>
                    <div>Fecha</div>
                    <div>Descripción</div>
                    <div>Tipo</div>
                    <div>Reportado por</div>
                    <div>Estado</div>
                    <div>Antigüedad</div>
                    <div>Foto</div>
                    <div>Detalle</div>
                </div>

                {cargando ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Cargando incidentes...
                    </div>
                ) : incidentesFiltrados.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {busqueda
                            ? `No hay resultados para "${busqueda}".`
                            : soloAbiertos
                              ? 'No queda ningún incidente sin resolver.'
                              : 'No se registraron incidentes con ese filtro.'}
                    </div>
                ) : (
                    incidentesFiltrados.map((incidente) => {
                        const esViejo =
                            incidente.dias_abierto !== null &&
                            incidente.dias_abierto >= DIAS_PARA_DESTACAR_ANTIGUEDAD;
                        const [fecha, hora] = formatearFechaHora(incidente.fecha_hora_reporte).split(' ');

                        return (
                            <div
                                key={incidente.id}
                                className={styles.filaItem}
                                style={{
                                    gridTemplateColumns: GRILLA,
                                    alignItems: 'center',
                                    ...(soloAbiertos && esViejo
                                        ? {
                                              borderLeft: '3px solid var(--rojo-texto)',
                                              backgroundColor: 'color-mix(in srgb, var(--rojo-texto) 7%, transparent)',
                                          }
                                        : {}),
                                }}
                            >
                                <div style={{ ...CELDA_SIN_CORTE, lineHeight: 1.35 }}>
                                    <div>{fecha}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{hora}</div>
                                </div>

                                <div
                                    style={{
                                        fontSize: '0.88rem',
                                        textAlign: 'left',
                                        lineHeight: 1.4,
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    {incidente.descripcion}
                                </div>

                                <div style={{ fontSize: '0.86rem', lineHeight: 1.3 }}>
                                    {ETIQUETA_TIPO[incidente.tipo]}
                                </div>

                                <div style={{ ...CELDA_SIN_CORTE, lineHeight: 1.35 }}>
                                    <div>{nombreCompleto(incidente.empleado)}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                        {incidente.empleado.legajo}
                                    </div>
                                </div>

                                <div style={CELDA_SIN_CORTE}>
                                    <span
                                        style={{
                                            fontWeight: 'bold',
                                            color: COLOR_ESTADO[incidente.estado],
                                        }}
                                    >
                                        {ETIQUETA_ESTADO[incidente.estado]}
                                    </span>
                                </div>

                                <div
                                    style={{
                                        ...CELDA_SIN_CORTE,
                                        fontWeight: esViejo ? 'bold' : 'normal',
                                        color: esViejo ? 'var(--rojo-texto)' : 'var(--text-muted)',
                                    }}
                                    title={
                                        esViejo
                                            ? `Abierto hace mas de ${DIAS_PARA_DESTACAR_ANTIGUEDAD} dias`
                                            : undefined
                                    }
                                >
                                    {textoAntiguedad(incidente.dias_abierto)}
                                </div>

                                <div>
                                    {incidente.archivo_url ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                abrirArchivoEnPestania(incidente.archivo_url!, incidente.archivo_nombre)
                                            }
                                            title={incidente.archivo_nombre ?? 'Ver foto del incidente'}
                                            aria-label={incidente.archivo_nombre ?? 'Ver foto del incidente'}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                cursor: 'pointer',
                                                color: 'var(--azul-texto)',
                                                fontSize: '1.05rem',
                                            }}
                                        >
                                            <i className="bi bi-camera"></i>
                                        </button>
                                    ) : (
                                        <Link
                                            to={`/incidentes/${incidente.id}`}
                                            title="Sin foto. Entrá al detalle para adjuntarla."
                                            style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}
                                        >
                                            <i className="bi bi-plus-circle"></i>
                                        </Link>
                                    )}
                                </div>

                                <div className={styles.grupoBotonesTabla}>
                                    <Link to={`/incidentes/${incidente.id}`} title="Ver detalle">
                                        <Boton variant="ver" style={{ padding: '8px 12px' }} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
