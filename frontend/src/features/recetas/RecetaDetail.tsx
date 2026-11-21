import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { getAditivos } from '../../services/aditivosServices';
import { getInsumos } from '../../services/insumosServices';
import { getEquipos } from '../../services/equiposServices';
import {
    getComposicionReceta,
    getRecetaById,
    getVersionesReceta,
    RecetasApiError,
} from '../../services/recetasServices';
import { exportarRecetaPDF } from '../../utils/exportarRecetaPdf';
import type { Aditivo } from '../../types/aditivos';
import type { Insumo } from '../../types/insumos';
import type { Equipo } from '../../types/equipos';
import type { ComposicionReceta, Receta, VersionReceta } from '../../types/receta';
import EscalarReceta from './EscalarReceta';
import styles from '../../styles/shared.module.css';

interface RespuestaDetalle {
    clave: string;
    receta: Receta | null;
    versiones: VersionReceta[];
    insumos: Insumo[];
    aditivos: Aditivo[];
    equipos: Equipo[];
    error: string | null;
}

function formatearGramos(valor: number): string {
    return `${new Intl.NumberFormat('es-AR', {
        maximumFractionDigits: 2,
    }).format(valor)} g`;
}

function formatearPorcentaje(valor: number): string {
    return `${new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(valor)} %`;
}

function formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin especificar';
    const partes = fecha.slice(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha;
}

export default function RecetaDetail() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';
    const { id = '' } = useParams();

    const [respuesta, setRespuesta] = useState<RespuestaDetalle | null>(null);
    const [nroVersionSeleccionada, setNroVersionSeleccionada] = useState<number | null>(null);
    const [composicion, setComposicion] = useState<ComposicionReceta | null>(null);
    const [cargandoComposicion, setCargandoComposicion] = useState(false);
    const [errorComposicion, setErrorComposicion] = useState<string | null>(null);

    useEffect(() => {
        let cancelado = false;

        const cargarDetalle = async () => {
            try {
                const [receta, insumos, aditivos, equipos] = await Promise.all([
                    getRecetaById(id),
                    getInsumos(),
                    getAditivos(),
                    getEquipos(),
                ]);

                let versionesData: VersionReceta[] = [];
                try {
                    versionesData = await getVersionesReceta(id);
                } catch (problema) {
                    if (
                        problema instanceof RecetasApiError
                        && problema.status !== 404
                    ) {
                        throw problema;
                    }
                }

                if (!cancelado) {
                    setRespuesta({
                        clave: id,
                        receta,
                        versiones: versionesData,
                        insumos,
                        aditivos,
                        equipos,
                        error: null,
                    });

                    const vigente = versionesData.find((v) => v.estado === 'activo') || versionesData[0];
                    if (vigente) {
                        setNroVersionSeleccionada(vigente.version);
                    }
                }
            } catch (problema) {
                console.error('Error al cargar el detalle de la receta:', problema);
                if (!cancelado) {
                    setRespuesta({
                        clave: id,
                        receta: null,
                        versiones: [],
                        insumos: [],
                        aditivos: [],
                        equipos: [],
                        error: problema instanceof Error
                            ? problema.message
                            : 'No se pudo cargar el detalle de la receta.',
                    });
                }
            }
        };

        void cargarDetalle();
        return () => {
            cancelado = true;
        };
    }, [id]);

    const actual = respuesta?.clave === id ? respuesta : null;
    const receta = actual?.receta ?? null;
    const versiones = actual?.versiones ?? [];

    const version = useMemo(() => {
        if (!versiones || versiones.length === 0) return null;
        return versiones.find((v) => v.version === nroVersionSeleccionada) || versiones[0];
    }, [versiones, nroVersionSeleccionada]);

    useEffect(() => {
        if (!esAdmin || !version) {
            setComposicion(null);
            return;
        }

        let cancelado = false;

        const cargarComposicion = async () => {
            try {
                setCargandoComposicion(true);
                setErrorComposicion(null);
                setComposicion(null);

                const resultado = await getComposicionReceta(
                    id,
                    version.version,
                );

                if (!cancelado) {
                    setComposicion(resultado);
                }
            } catch (error) {
                if (!cancelado) {
                    setErrorComposicion(
                        error instanceof Error
                            ? error.message
                            : 'No se pudo obtener la composición porcentual.',
                    );
                }
            } finally {
                if (!cancelado) {
                    setCargandoComposicion(false);
                }
            }
        };

        void cargarComposicion();

        return () => {
            cancelado = true;
        };
    }, [id, esAdmin, version?.version]);

    const handleDescargarPDF = async () => {
        if (!receta || !version) return;
        await exportarRecetaPDF({
            nombreProducto: receta.producto.nombre,
            version: version.version,
            rendimientoFinalGramos: version.rendimiento_final_gramos,
            unidadVentaGramos: version.unidad_venta_gramos,
            medidaCasera: version.medida_casera,
            motivoCambio: version.motivo_cambio,
            fechaVigencia: version.fecha_vigencia,
            detalles: version.detalles,
            pasos: version.pasos,
            insumos: actual?.insumos,
            aditivos: actual?.aditivos,
            equipos: actual?.equipos,
        });
    };

    const insumosPorId = useMemo(
        () => new Map((actual?.insumos ?? []).map((insumo) => [insumo.id, insumo])),
        [actual?.insumos],
    );
    const aditivosPorId = useMemo(
        () => new Map((actual?.aditivos ?? []).map((aditivo) => [aditivo.id, aditivo])),
        [actual?.aditivos],
    );

    if (actual === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Detalle de la Receta" ancho="900px" />
                <p className={styles.textMuted}>Cargando receta…</p>
            </div>
        );
    }

    if (actual.error || receta === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Detalle de la Receta" ancho="900px" />
                <p className={styles.textDanger} role="alert">
                    {actual.error ?? 'No se encontró la receta.'}
                </p>
                <Link to="/recetas">
                    <Boton variant="volver">Volver a la lista</Boton>
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={receta.producto.nombre}
                descripcion="Ficha técnica de receta e historial de versiones."
                ancho="900px"
                acciones={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {version && (
                            <Boton type="button" variant="descargar" onClick={handleDescargarPDF}>
                                Descargar PDF
                            </Boton>
                        )}
                        {esAdmin && (
                            <Link to={`/recetas/${receta.id}/nueva-version`}>
                                <Boton variant="crear">Nueva versión</Boton>
                            </Link>
                        )}
                    </div>
                }
            />

            <div
                className={styles.tarjetaEstatica}
                style={{ maxWidth: '900px', width: '100%', boxSizing: 'border-box' }}
            >
                {!version ? (
                    <p className={styles.textMuted}>
                        Esta receta todavía no tiene versiones registradas.
                    </p>
                ) : (
                    <>
                        {/* Selector de Versión e Insignia */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                paddingBottom: '14px',
                                borderBottom: '1px solid var(--border-color, #334155)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-h)' }}>
                                    Historial de Versión:
                                </label>
                                <select
                                    value={nroVersionSeleccionada ?? version.version}
                                    onChange={(e) => setNroVersionSeleccionada(Number(e.target.value))}
                                    className={styles.input}
                                    style={{ width: 'auto', padding: '6px 12px', fontWeight: 600 }}
                                >
                                    {versiones.map((v) => (
                                        <option key={v.version} value={v.version}>
                                            v{v.version} {v.estado === 'activo' ? '(Vigente)' : '(Archivada)'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                {version.estado === 'activo' ? (
                                    <span style={{ fontSize: '0.88rem', color: '#22c55e', fontWeight: 600 }}>
                                        ● Versión Vigente (Activa)
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.88rem', color: '#eab308', fontWeight: 600 }}>
                                        ● Archivada (Solo lectura)
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGrid}>
                            <p>
                                <strong>Rendimiento final:</strong>{' '}
                                {formatearGramos(version.rendimiento_final_gramos)}
                            </p>
                            <p>
                                <strong>Unidad de venta:</strong>{' '}
                                {formatearGramos(version.unidad_venta_gramos)}
                            </p>
                            <p>
                                <strong>Medida casera:</strong>{' '}
                                {version.medida_casera || '—'}
                            </p>
                            <p>
                                <strong>Fecha de vigencia:</strong>{' '}
                                {formatearFecha(version.fecha_vigencia)}
                            </p>
                            <p style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                                <strong>Motivo del cambio:</strong>{' '}
                                {version.motivo_cambio || '—'}
                            </p>
                        </div>

                        <section className={styles.bloqueDetalle} aria-labelledby="receta-detalles">
                            <h3 id="receta-detalles">Ingredientes y aditivos</h3>
                            {version.detalles.length === 0 ? (
                                <p className={styles.textMuted}>
                                    Esta versión no tiene ingredientes ni aditivos cargados.
                                </p>
                            ) : (
                                <ul>
                                    {version.detalles
                                        .toSorted((a, b) => a.renglon - b.renglon)
                                        .map((detalle) => {
                                            const insumo = insumosPorId.get(detalle.insumo_id);
                                            const aditivo = detalle.aditivo_id
                                                ? aditivosPorId.get(detalle.aditivo_id)
                                                : null;

                                            return (
                                                <li
                                                    key={`${detalle.receta_id}-${detalle.nro_version}-${detalle.renglon}`}
                                                >
                                                    <strong>
                                                        {insumo?.nombre ?? `Insumo #${detalle.insumo_id}`}
                                                    </strong>
                                                    {' — '}
                                                    {formatearGramos(detalle.cantidad_gramos)}
                                                    {' · '}
                                                    {detalle.tipo_uso === 'ingrediente'
                                                        ? 'Ingrediente'
                                                        : 'Aditivo'}
                                                    {aditivo
                                                        ? ` · ${aditivo.nombre_completo}${aditivo.numero_ins ? ` (INS ${aditivo.numero_ins})` : ''}`
                                                        : ''}
                                                </li>
                                            );
                                        })}
                                </ul>
                            )}
                        </section>

                        {esAdmin && (
                            <section
                                className={styles.bloqueDetalle}
                                aria-labelledby="receta-composicion"
                            >
                                <h3 id="receta-composicion">
                                    Composición porcentual
                                </h3>

                                {cargandoComposicion && (
                                    <p className={styles.textMuted}>
                                        Calculando composición...
                                    </p>
                                )}

                                {errorComposicion && (
                                    <p className={styles.textDanger} role="alert">
                                        {errorComposicion}
                                    </p>
                                )}

                                {composicion && (
                                    <>
                                        <p>
                                            <strong>Peso total:</strong>{' '}
                                            {formatearGramos(composicion.total_gramos)}
                                        </p>

                                        <h4>Ingredientes</h4>

                                        {composicion.ingredientes.length === 0 ? (
                                            <p className={styles.textMuted}>
                                                No hay ingredientes registrados.
                                            </p>
                                        ) : (
                                            <ul>
                                                {composicion.ingredientes.map((item) => (
                                                    <li key={item.renglon}>
                                                        <strong>{item.nombre_insumo}</strong>
                                                        {' — '}
                                                        {formatearGramos(item.cantidad_gramos)}
                                                        {' — '}
                                                        {formatearPorcentaje(item.porcentaje)}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        <h4>Aditivos</h4>

                                        {composicion.aditivos.length === 0 ? (
                                            <p className={styles.textMuted}>
                                                No hay aditivos registrados.
                                            </p>
                                        ) : (
                                            <ul>
                                                {composicion.aditivos.map((item) => (
                                                    <li key={item.renglon}>
                                                        <strong>{item.nombre_insumo}</strong>
                                                        {' — '}
                                                        {formatearGramos(item.cantidad_gramos)}
                                                        {' — '}
                                                        {formatearPorcentaje(item.porcentaje)}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        <p>
                                            <strong>Suma de porcentajes:</strong>{' '}
                                            {formatearPorcentaje(composicion.suma_porcentajes)}
                                        </p>

                                        <p
                                            style={{
                                                color: composicion.suma_correcta ? '#22c55e' : '#ef4444',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {composicion.suma_correcta
                                                ? '✓ La composición suma 100 %.'
                                                : '⚠ La composición no suma 100 %.'}
                                        </p>
                                    </>
                                )}
                            </section>
                        )}

                        <section className={styles.bloqueDetalle} aria-labelledby="receta-pasos">
                            <h3 id="receta-pasos">Pasos de elaboración</h3>
                            {version.pasos.length === 0 ? (
                                <p className={styles.textMuted}>
                                    Esta versión no tiene pasos de elaboración cargados.
                                </p>
                            ) : (
                                <ol>
                                    {version.pasos
                                        .toSorted((a, b) => a.orden - b.orden)
                                        .map((paso) => (
                                            <li key={paso.id} style={{ marginBottom: '16px' }}>
                                                <strong>{paso.nombre_paso}</strong>
                                                {paso.es_punto_control && (
                                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}> · Punto Crítico de Control (PCC)</span>
                                                )}
                                                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '6px' }}>
                                                    {paso.procedimiento}
                                                </p>
                                                <p className={styles.textMuted} style={{ marginTop: 0 }}>
                                                    {paso.equipo
                                                        ? `Equipo: ${paso.equipo.nombre}`
                                                        : 'Sin equipo asociado'}
                                                    {paso.tiempo_minutos !== null
                                                        ? ` · ${paso.tiempo_minutos} min`
                                                        : ''}
                                                    {paso.temperatura_celsius !== null
                                                        ? ` · ${paso.temperatura_celsius} °C`
                                                        : ''}
                                                </p>
                                            </li>
                                        ))}
                                </ol>
                            )}
                        </section>

                        <section className={styles.bloqueDetalle} aria-labelledby="titulo-escalar-receta">
                            <EscalarReceta productoId={receta.producto_id} />
                        </section>
                    </>
                )}

                <div className={styles.bloqueDetalle}>
                    <Link to="/recetas">
                        <Boton variant="volver">Volver a la lista</Boton>
                    </Link>
                </div>
            </div>
        </div>
    );
}
