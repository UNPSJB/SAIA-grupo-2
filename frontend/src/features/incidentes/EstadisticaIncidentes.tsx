import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { Incidente, TipoIncidente } from '../../types/incidentes';
import { getEstadisticasIncidentes, getIncidentes } from '../../services/incidentesServices';
import type { EstadisticaIncidente } from '../../services/incidentesServices';
import {
    COLOR_ESTADO,
    COLOR_TIPO,
    ETIQUETA_ESTADO,
    ETIQUETA_TIPO,
    TEXTO_SOBRE_COLOR_TIPO,
    TIPOS_INCIDENTE,
    formatearFechaHora,
} from './estadoIncidente';
import GraficoBarrasHorizontales from '../../components/GraficoBarrasHorizontales';
import GraficoTorta from '../../components/GraficoTorta';
import IndicadoresResumen from '../../components/IndicadoresResumen';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import estilos from '../../components/Estadisticas.module.css';
import styles from '../../styles/shared.module.css';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function fechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function haceDias(dias: number): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fechaLocal(fecha);
}

function inicioDelMes(): string {
    const hoy = new Date();
    return fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
}

function inicioDelAnio(): string {
    return fechaLocal(new Date(new Date().getFullYear(), 0, 1));
}

function diasEntre(desde: string, hasta: string): number {
    const inicio = new Date(`${desde}T00:00:00`).getTime();
    const fin = new Date(`${hasta}T00:00:00`).getTime();
    return Math.round((fin - inicio) / MS_POR_DIA) + 1;
}

const RANGOS = [
    { etiqueta: 'Últimos 7 días', desde: () => haceDias(6) },
    { etiqueta: 'Últimos 30 días', desde: () => haceDias(29) },
    { etiqueta: 'Este mes', desde: inicioDelMes },
    { etiqueta: 'Este año', desde: inicioDelAnio },
];

const unidadIncidentes = (valor: number) => `${valor} ${valor === 1 ? 'incidente' : 'incidentes'}`;

interface Respuesta<T> {
    clave: string;
    datos: T;
    error: boolean;
}

export default function EstadisticaIncidentes() {
    const hoy = fechaLocal(new Date());
    const [fechaDesde, setFechaDesde] = useState(() => haceDias(29));
    const [fechaHasta, setFechaHasta] = useState(hoy);
    const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoIncidente | null>(null);
    const [estadisticas, setEstadisticas] = useState<Respuesta<EstadisticaIncidente[]> | null>(null);
    const [detalle, setDetalle] = useState<Respuesta<Incidente[]> | null>(null);

    const rangoValido = Boolean(fechaDesde && fechaHasta && fechaDesde <= fechaHasta);
    const claveRango = `${fechaDesde}|${fechaHasta}`;
    const claveDetalle = `${claveRango}|${tipoSeleccionado ?? ''}`;

    useEffect(() => {
        if (!rangoValido) return;
        let cancelado = false;

        getEstadisticasIncidentes(fechaDesde, fechaHasta)
            .then((datos) => {
                if (!cancelado) setEstadisticas({ clave: claveRango, datos, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar estadísticas:', problema);
                if (!cancelado) setEstadisticas({ clave: claveRango, datos: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, [claveRango, fechaDesde, fechaHasta, rangoValido]);

    useEffect(() => {
        if (!rangoValido || !tipoSeleccionado) return;
        let cancelado = false;

        getIncidentes(undefined, tipoSeleccionado)
            .then((incidentes) => {
                if (cancelado) return;
                const enRango = incidentes.filter((incidente) => {
                    const dia = fechaLocal(new Date(incidente.fecha_hora_reporte));
                    return dia >= fechaDesde && dia <= fechaHasta;
                });
                setDetalle({ clave: claveDetalle, datos: enRango, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar el detalle:', problema);
                if (!cancelado) setDetalle({ clave: claveDetalle, datos: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, [claveDetalle, fechaDesde, fechaHasta, rangoValido, tipoSeleccionado]);

    const cargando = rangoValido && estadisticas?.clave !== claveRango;
    const errorCarga = !cargando && estadisticas?.error === true;
    const cargandoDetalle = tipoSeleccionado !== null && detalle?.clave !== claveDetalle;

    const conteos = TIPOS_INCIDENTE.map((tipo) => ({
        clave: tipo,
        etiqueta: ETIQUETA_TIPO[tipo],
        valor:
            (estadisticas?.clave === claveRango
                ? estadisticas.datos.find((item) => item.tipo === tipo)?.cantidad
                : 0) ?? 0,
    }));

    const total = conteos.reduce((suma, item) => suma + item.valor, 0);
    const maximo = Math.max(...conteos.map((item) => item.valor));
    const masFrecuentes = conteos.filter((item) => maximo > 0 && item.valor === maximo);
    const etiquetasMasFrecuentes = masFrecuentes.map((item) => item.etiqueta);
    const nombresMasFrecuentes =
        etiquetasMasFrecuentes.length > 1
            ? `${etiquetasMasFrecuentes.slice(0, -1).join(', ')} y ${etiquetasMasFrecuentes[etiquetasMasFrecuentes.length - 1]}`
            : (etiquetasMasFrecuentes[0] ?? '');
    const dias = rangoValido ? diasEntre(fechaDesde, fechaHasta) : 0;
    const semanas = Math.max(dias / 7, 1);
    const promedioSemanal = total / semanas;

    const aplicarRango = (desde: string) => {
        setFechaDesde(desde);
        setFechaHasta(hoy);
    };

    const alternarTipo = (clave: string) => {
        const tipo = clave as TipoIncidente;
        setTipoSeleccionado((actual) => (actual === tipo ? null : tipo));
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <div className={estilos.pagina}>
                <EncabezadoPagina
                    titulo="Estadísticas de Incidentes"
                    descripcion="Cuántos incidentes se reportaron de cada tipo en el período elegido."
                    ancho="100%"
                />

                <div className={estilos.filtros}>
                    <label className={estilos.campoFecha}>
                        Desde
                        <input
                            type="date"
                            className={styles.filtroFecha}
                            value={fechaDesde}
                            max={fechaHasta || hoy}
                            onChange={(evento) => setFechaDesde(evento.target.value)}
                        />
                    </label>
                    <label className={estilos.campoFecha}>
                        Hasta
                        <input
                            type="date"
                            className={styles.filtroFecha}
                            value={fechaHasta}
                            min={fechaDesde || undefined}
                            max={hoy}
                            onChange={(evento) => setFechaHasta(evento.target.value)}
                        />
                    </label>
                    <div className={estilos.rangos} role="group" aria-label="Rangos rápidos">
                        {RANGOS.map((rango) => {
                            const desde = rango.desde();
                            const activo = fechaDesde === desde && fechaHasta === hoy;
                            return (
                                <button
                                    key={rango.etiqueta}
                                    type="button"
                                    className={`${estilos.rango} ${activo ? estilos.rangoActivo : ''}`}
                                    aria-pressed={activo}
                                    onClick={() => aplicarRango(desde)}
                                >
                                    {rango.etiqueta}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {!rangoValido && (
                    <p className={estilos.aviso}>La fecha desde no puede ser posterior a la fecha hasta.</p>
                )}
                {errorCarga && <p className={estilos.aviso}>No se pudieron cargar las estadísticas.</p>}

                {rangoValido && !errorCarga && (
                    <>
                        <IndicadoresResumen
                            indicadores={[
                                {
                                    titulo: 'Incidentes en el período',
                                    valor: cargando ? '…' : total,
                                    detalle: `${dias} ${dias === 1 ? 'día' : 'días'}`,
                                },
                                {
                                    titulo: masFrecuentes.length > 1 ? 'Tipos más frecuentes' : 'Tipo más frecuente',
                                    valor: cargando
                                        ? '…'
                                        : total === 0
                                          ? '—'
                                          : masFrecuentes.length > 2
                                            ? `Empate de ${masFrecuentes.length}`
                                            : nombresMasFrecuentes,
                                    detalle:
                                        total === 0
                                            ? 'Sin incidentes en el período'
                                            : masFrecuentes.length > 2
                                              ? `${nombresMasFrecuentes}: ${maximo} cada uno`
                                              : masFrecuentes.length > 1
                                                ? `${maximo} cada uno, de ${total}`
                                                : `${maximo} de ${total} (${Math.round((maximo / total) * 100)}%)`,
                                },
                                {
                                    titulo: 'Promedio semanal',
                                    valor: cargando ? '…' : promedioSemanal.toLocaleString('es-AR', { maximumFractionDigits: 1 }),
                                    detalle: 'incidentes por semana',
                                },
                            ]}
                        />

                        <div className={estilos.graficos}>
                            <section className={estilos.tarjeta}>
                                <div className={estilos.tarjetaEncabezado}>
                                    <h3>Incidentes por tipo</h3>
                                    <span className={estilos.tarjetaAyuda}>
                                        Hacé clic en un tipo para ver sus incidentes
                                    </span>
                                </div>

                                {cargando ? (
                                    <p className={estilos.vacio}>Cargando estadísticas…</p>
                                ) : (
                                    <GraficoBarrasHorizontales
                                        items={conteos}
                                        seleccionado={tipoSeleccionado}
                                        onSeleccionar={alternarTipo}
                                        colores={COLOR_TIPO}
                                        unidad={unidadIncidentes}
                                    />
                                )}
                            </section>

                            <section className={estilos.tarjeta}>
                                <div className={estilos.tarjetaEncabezado}>
                                    <h3>Distribución</h3>
                                    <span className={estilos.tarjetaAyuda}>Porción de cada tipo sobre el total</span>
                                </div>

                                {cargando ? (
                                    <p className={estilos.vacio}>Cargando estadísticas…</p>
                                ) : total === 0 ? (
                                    <p className={estilos.vacio}>No hay incidentes en el período.</p>
                                ) : (
                                    <GraficoTorta
                                        items={conteos}
                                        colores={COLOR_TIPO}
                                        colorTexto={TEXTO_SOBRE_COLOR_TIPO}
                                        seleccionado={tipoSeleccionado}
                                        onSeleccionar={alternarTipo}
                                        unidad={unidadIncidentes}
                                    />
                                )}
                            </section>
                        </div>
                    </>
                )}

                {rangoValido && tipoSeleccionado && (
                    <section className={estilos.tarjeta}>
                        <div className={estilos.tarjetaEncabezado}>
                            <h3>{ETIQUETA_TIPO[tipoSeleccionado]}</h3>
                            <Boton variant="volver" onClick={() => setTipoSeleccionado(null)}>
                                Cerrar detalle
                            </Boton>
                        </div>

                        {cargandoDetalle ? (
                            <p className={estilos.vacio}>Cargando incidentes…</p>
                        ) : detalle?.error ? (
                            <p className={estilos.aviso}>No se pudo cargar el detalle.</p>
                        ) : !detalle || detalle.datos.length === 0 ? (
                            <p className={estilos.vacio}>No hay incidentes de este tipo en el período.</p>
                        ) : (
                            <div className={styles.contenedorTabla} style={{ marginTop: 0 }}>
                                <div className={styles.filaHeader} style={{ gridTemplateColumns: '1.1fr 2.4fr 0.9fr 0.5fr' }}>
                                    <div>Fecha</div>
                                    <div>Descripción</div>
                                    <div>Estado</div>
                                    <div></div>
                                </div>
                                {detalle.datos.map((incidente) => (
                                    <div
                                        key={incidente.id}
                                        className={styles.filaItem}
                                        style={{ gridTemplateColumns: '1.1fr 2.4fr 0.9fr 0.5fr', textAlign: 'left' }}
                                    >
                                        <div>{formatearFechaHora(incidente.fecha_hora_reporte)}</div>
                                        <div style={{ overflowWrap: 'anywhere' }}>{incidente.descripcion}</div>
                                        <div className={estilos.estado}>
                                            <span
                                                className={estilos.estadoPunto}
                                                style={{ backgroundColor: COLOR_ESTADO[incidente.estado] }}
                                                aria-hidden="true"
                                            />
                                            {ETIQUETA_ESTADO[incidente.estado]}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Link to={`/incidentes/${incidente.id}`} title="Ver detalle del incidente">
                                                <Boton variant="ver" style={{ padding: '6px 10px' }} />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
