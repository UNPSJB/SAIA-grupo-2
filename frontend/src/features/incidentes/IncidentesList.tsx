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
import EncabezadoPagina from '../../components/EncabezadoPagina';
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
import BarraFiltros, { type FiltroConfig } from '../../components/BarraFiltros';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';

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


        // Si la pantalla es "soloAbiertos", no mostramos el filtro de estado porque ya están fijos
    const misFiltros: FiltroConfig[] = !soloAbiertos ? [
        {
            label: "Estado:",
            value: filtroEstado,
            onChange: (val: string) => setFiltroEstado(val as EstadoIncidente | ''),
            opciones: [
                { value: "", label: "Todos los estados" },
                ...ESTADOS_INCIDENTE.map((estado) => ({
                    value: estado,
                    label: ETIQUETA_ESTADO[estado]
                }))
            ]
        }
    ] : [];

    // Función para resetear los filtros al presionar "Limpiar Filtros"
    const limpiarFiltros = () => {
        setFiltroEstado('');
        setBusqueda('');
    };


    const misColumnas: Columna<Incidente>[] = [
        {
            key: 'fecha_hora_reporte',
            encabezado: 'Fecha',
            ordenable: true,
            variant: 'celdaBase', // celdaBase formatea el segundo div abajo en gris automáticamente
            render: (inc) => {
                const [fecha, hora] = formatearFechaHora(inc.fecha_hora_reporte).split(' ');
                return (
                    <>
                        <div>{fecha}</div>
                        <div>{hora}</div>
                    </>
                );
            }
        },
        {
            key: 'descripcion',
            encabezado: 'Descripción',
            ordenable: true,
            render: (inc) => inc.descripcion
        },
        {
            key: 'tipo',
            encabezado: 'Tipo',
            ordenable: true,
            variant: 'badge',
            valorOrdenamiento: (inc) => ETIQUETA_TIPO[inc.tipo],
            render: (inc) => <span>{ETIQUETA_TIPO[inc.tipo]}</span>
        },
        {
            key: 'empleado',
            encabezado: 'Reportado por',
            ordenable: true,
            variant: 'celdaBase',
            valorOrdenamiento: (inc) => nombreCompleto(inc.empleado),
            render: (inc) => (
                <>
                    <div>{nombreCompleto(inc.empleado)}</div>
                    <div>{inc.empleado.legajo}</div>
                </>
            )
        },
        {
            key: 'estado',
            encabezado: 'Estado',
            ordenable: true,
            // 'pendiente' pinta en rojo y 'activo' en verde desde TablaPaginada.module.css
            variant: (inc) => inc.estado === 'abierto' ? 'pendiente' : 'activo',
            render: (inc) => ETIQUETA_ESTADO[inc.estado]
        },
        {
            key: 'antiguedad',
            encabezado: 'Antigüedad',
            ordenable: true,
            variant: (inc) => (inc.dias_abierto !== null && inc.dias_abierto >= DIAS_PARA_DESTACAR_ANTIGUEDAD) ? 'estado_vencido' : 'muted',
            valorOrdenamiento: (inc) => inc.dias_abierto ?? -1,
            render: (inc) => textoAntiguedad(inc.dias_abierto)
        },
        {
            key: 'foto',
            encabezado: 'Foto',
            variant: 'acciones',
            render: (inc) => inc.archivo_url ? (
                <button
                    type="button"
                    className={styles.linkSubrayado}
                    onClick={() => abrirArchivoEnPestania(inc.archivo_url!, inc.archivo_nombre)}
                    title={inc.archivo_nombre ?? 'Ver foto del incidente'}
                >
                    <i className="bi bi-camera"></i>
                </button>
            ) : (
                <Link
                    to={`/incidentes/${inc.id}`}
                    className={styles.textMuted}
                    title="Sin foto. Entrar al detalle para adjuntarla"
                >
                    <i className="bi bi-plus-circle"></i>
                </Link>
            )
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (inc) => (
                <Link to={`/incidentes/${inc.id}`} title="Ver detalle">
                    <Boton variant="ver" />
                </Link>
            )
        }
    ];




    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={soloAbiertos ? 'Incidentes Abiertos' : 'Incidentes Reportados'}
                //ancho="1280px"
                descripcion={
                    soloAbiertos
                        ? incidentes.length > 0
                            ? `${incidentes.length} ${incidentes.length === 1 ? 'incidente sigue' : 'incidentes siguen'} sin resolver, del más antiguo al más reciente.`
                            : 'No queda ningún incidente sin resolver.'
                        : abiertos > 0
                          ? `${abiertos} ${abiertos === 1 ? 'incidente abierto' : 'incidentes abiertos'} esperando resolución.`
                          : 'No hay incidentes abiertos.'
                }
                acciones={
                    <Link to="/incidentes/nuevo">
                        <Boton variant="crear">Registrar Incidente</Boton>
                    </Link>
                }
            />

            {/* {soloAbiertos && resumen && resumen.abiertos > 0 && (
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
            )} */}

            {/* <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    width: '100%',
                    maxWidth: '1280px',
                    marginBottom: '16px',
                }}
            >
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
            </div> */}


            {/* Y EN SU LUGAR PONER LA BARRA MODULAR: */}
            <BarraFiltros
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                placeholderBusqueda="Buscar por descripción o persona..."
                onLimpiar={limpiarFiltros}
                mostrarBotonLimpiar={(!soloAbiertos && filtroEstado !== '') || busqueda !== ''}
                filtros={misFiltros}
>
                {/* Contadores adentro de la barra de filtros */}
                {soloAbiertos && resumen && resumen.abiertos > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Pendientes por tipo:
                        </span>
                        {resumen.abiertos_por_tipo
                            .filter((conteo) => conteo.cantidad > 0)
                            .map((conteo) => (
                                <span
                                    key={conteo.tipo}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '999px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg)',
                                        color: 'var(--text)',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {ETIQUETA_TIPO[conteo.tipo]}:{' '}
                                    <strong style={{ color: 'var(--text-h)' }}>{conteo.cantidad}</strong>
                                </span>
                            ))}
                    </div>
                )}
            </BarraFiltros>

            {error && <p style={{ color: 'var(--rojo-texto)' }}>{error}</p>}

            
            
            <div style={{ maxWidth: '1100px', width: '100%' }}>
                <TablaPaginada
                    datos={incidentesFiltrados}
                    columnas={misColumnas}
                    gridTemplateColumns="1fr 2.3fr 1fr 1.3fr 0.9fr 0.9fr 0.6fr 0.8fr"
                    itemsPorPagina={8}
                    mensajeVacio={
                        busqueda
                            ? `No hay resultados para "${busqueda}".`
                            : soloAbiertos
                            ? 'No queda ningún incidente sin resolver.'
                            : 'No se registraron incidentes con ese filtro.'
                    }
                    columnaOrdenInicial="fecha_hora_reporte"
                    ordenAscInicial={soloAbiertos ? true : true}
                />
            </div>
{/*             
            <div className={styles.contenedorTabla} style={{ maxWidth: '100%', width: '100%' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: GRILLA, minWidth: '820px' }}>
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
                                    minWidth: '820px',
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
            </div> */}
        </div>
    );
}
